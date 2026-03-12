import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';

/// ZeroVault encryption module — matches the web app's AES-256-GCM + PBKDF2.
///
/// Format: base64(salt).base64(iv).base64(ciphertext+tag)
class VaultCrypto {
  static const int pbkdf2Iterations = 600000;
  static const int saltLength = 32;
  static const int ivLength = 12;
  static const int keyBits = 256;
  static const String verificationToken = 'zerovault-verification-token-v1';

  static final _pbkdf2 = Pbkdf2(
    macAlgorithm: Hmac.sha256(),
    iterations: pbkdf2Iterations,
    bits: keyBits,
  );

  static final _aesGcm = AesGcm.with256bits();

  /// Derive a 256-bit key from [password] and [salt].
  static Future<SecretKey> deriveKey(String password, List<int> salt) async {
    final secretKey = SecretKey(utf8.encode(password));
    return _pbkdf2.deriveKey(secretKey: secretKey, nonce: salt);
  }

  /// Encrypt [plaintext] with [masterPassword].
  /// Returns format: base64(salt).base64(iv).base64(ciphertext+tag)
  static Future<String> encrypt(String plaintext, String masterPassword) async {
    final salt = SecretKeyData.random(length: saltLength).bytes;
    final iv = SecretKeyData.random(length: ivLength).bytes;
    final key = await deriveKey(masterPassword, salt);

    final secretBox = await _aesGcm.encrypt(
      utf8.encode(plaintext),
      secretKey: key,
      nonce: iv,
    );

    // Combine ciphertext + mac (tag) to match web app format
    final combined = Uint8List.fromList([...secretBox.cipherText, ...secretBox.mac.bytes]);

    return [
      base64Encode(Uint8List.fromList(salt)),
      base64Encode(Uint8List.fromList(iv)),
      base64Encode(combined),
    ].join('.');
  }

  /// Decrypt [encryptedData] (salt.iv.ciphertext format) with [masterPassword].
  static Future<String> decrypt(String encryptedData, String masterPassword) async {
    final parts = encryptedData.split('.');
    if (parts.length != 3) {
      throw const FormatException('Invalid encrypted data format');
    }

    final salt = base64Decode(parts[0]);
    final iv = base64Decode(parts[1]);
    final combined = base64Decode(parts[2]);

    // Split combined into ciphertext + tag (last 16 bytes = GCM tag)
    if (combined.length < 16) {
      throw const FormatException('Encrypted data too short');
    }
    final cipherText = combined.sublist(0, combined.length - 16);
    final mac = Mac(combined.sublist(combined.length - 16));

    final key = await deriveKey(masterPassword, salt);

    final secretBox = SecretBox(
      cipherText,
      nonce: iv,
      mac: mac,
    );

    final decrypted = await _aesGcm.decrypt(secretBox, secretKey: key);
    return utf8.decode(decrypted);
  }

  /// Encrypt a file's bytes with [masterPassword].
  /// Returns encrypted bytes and metadata string.
  static Future<({Uint8List encryptedData, String metadata})> encryptFile(
    Uint8List fileBytes,
    String masterPassword,
    String fileName,
    String fileType,
  ) async {
    final salt = SecretKeyData.random(length: saltLength).bytes;
    final iv = SecretKeyData.random(length: ivLength).bytes;
    final key = await deriveKey(masterPassword, salt);

    final secretBox = await _aesGcm.encrypt(
      fileBytes,
      secretKey: key,
      nonce: iv,
    );

    final combined = Uint8List.fromList([...secretBox.cipherText, ...secretBox.mac.bytes]);

    final metadata = jsonEncode({
      'salt': base64Encode(Uint8List.fromList(salt)),
      'iv': base64Encode(Uint8List.fromList(iv)),
      'fileName': fileName,
      'fileType': fileType,
      'fileSize': fileBytes.length,
    });

    final encryptedMetadata = await encrypt(metadata, masterPassword);

    return (encryptedData: combined, metadata: encryptedMetadata);
  }

  /// Decrypt a file's bytes using encrypted metadata.
  static Future<({Uint8List bytes, String fileName, String fileType})> decryptFile(
    Uint8List encryptedBytes,
    String encryptedMetadata,
    String masterPassword,
  ) async {
    final metadataJson = await decrypt(encryptedMetadata, masterPassword);
    final meta = jsonDecode(metadataJson) as Map<String, dynamic>;

    final salt = base64Decode(meta['salt'] as String);
    final iv = base64Decode(meta['iv'] as String);
    final key = await deriveKey(masterPassword, salt);

    final cipherText = encryptedBytes.sublist(0, encryptedBytes.length - 16);
    final mac = Mac(encryptedBytes.sublist(encryptedBytes.length - 16));

    final secretBox = SecretBox(cipherText, nonce: iv, mac: mac);
    final decrypted = await _aesGcm.decrypt(secretBox, secretKey: key);

    return (
      bytes: Uint8List.fromList(decrypted),
      fileName: meta['fileName'] as String,
      fileType: meta['fileType'] as String,
    );
  }

  /// Verify master password against stored encrypted verification token.
  static Future<bool> verifyMasterPassword(
    String password,
    String encryptedVerification,
  ) async {
    try {
      final result = await decrypt(encryptedVerification, password);
      return result == verificationToken;
    } catch (_) {
      return false;
    }
  }

  /// Create encrypted verification token for new master password.
  static Future<String> createVerificationToken(String masterPassword) async {
    return encrypt(verificationToken, masterPassword);
  }
}
