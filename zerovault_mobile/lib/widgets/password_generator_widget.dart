import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class PasswordGeneratorWidget extends StatefulWidget {
  const PasswordGeneratorWidget({super.key});

  @override
  State<PasswordGeneratorWidget> createState() =>
      _PasswordGeneratorWidgetState();
}

class _PasswordGeneratorWidgetState extends State<PasswordGeneratorWidget> {
  double _length = 20;
  bool _uppercase = true;
  bool _lowercase = true;
  bool _numbers = true;
  bool _symbols = true;
  String _password = '';

  @override
  void initState() {
    super.initState();
    _generate();
  }

  void _generate() {
    String chars = '';
    if (_lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (_uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (_numbers) chars += '0123456789';
    if (_symbols) chars += '!@#\$%^&*()_+-=[]{}|;:,.<>?';
    if (chars.isEmpty) chars = 'abcdefghijklmnopqrstuvwxyz';

    final rng = Random.secure();
    setState(() {
      _password = List.generate(
        _length.toInt(),
        (_) => chars[rng.nextInt(chars.length)],
      ).join();
    });
  }

  int _strengthScore() {
    int score = 0;
    if (_password.length >= 8) score++;
    if (_password.length >= 12) score++;
    if (_password.length >= 16) score++;
    if (_lowercase) score++;
    if (_uppercase) score++;
    if (_numbers) score++;
    if (_symbols) score++;
    return score;
  }

  String _strengthLabel() {
    final s = _strengthScore();
    if (s <= 2) return 'Weak';
    if (s <= 4) return 'Fair';
    if (s <= 5) return 'Strong';
    return 'Very Strong';
  }

  Color _strengthColor() {
    final s = _strengthScore();
    if (s <= 2) return Colors.red;
    if (s <= 4) return Colors.orange;
    if (s <= 5) return Colors.blue;
    return Colors.green;
  }

  @override
  Widget build(BuildContext context) {
    final score = _strengthScore();
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.85,
      builder: (ctx, scrollController) => Padding(
        padding: const EdgeInsets.all(20),
        child: ListView(
          controller: scrollController,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Password Generator',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center),
            const SizedBox(height: 20),
            // Generated password
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: SelectableText(
                      _password,
                      style: const TextStyle(
                          fontFamily: 'monospace', fontSize: 16),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 20),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: _password));
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Copied!')));
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, size: 20),
                    onPressed: _generate,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            // Strength bar
            Row(
              children: [
                Expanded(
                  child: LinearProgressIndicator(
                    value: score / 7.0,
                    backgroundColor: Colors.white12,
                    valueColor: AlwaysStoppedAnimation(_strengthColor()),
                    minHeight: 6,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                const SizedBox(width: 12),
                Text(_strengthLabel(),
                    style: TextStyle(
                        color: _strengthColor(),
                        fontWeight: FontWeight.w600,
                        fontSize: 13)),
              ],
            ),
            const SizedBox(height: 20),
            // Length slider
            Row(
              children: [
                const Text('Length'),
                Expanded(
                  child: Slider(
                    value: _length,
                    min: 4,
                    max: 64,
                    divisions: 60,
                    label: _length.toInt().toString(),
                    onChanged: (v) {
                      setState(() => _length = v);
                      _generate();
                    },
                  ),
                ),
                SizedBox(
                  width: 32,
                  child: Text(_length.toInt().toString(),
                      textAlign: TextAlign.center),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Toggles
            SwitchListTile(
              title: const Text('Uppercase (A-Z)'),
              value: _uppercase,
              dense: true,
              onChanged: (v) {
                setState(() => _uppercase = v);
                _generate();
              },
            ),
            SwitchListTile(
              title: const Text('Lowercase (a-z)'),
              value: _lowercase,
              dense: true,
              onChanged: (v) {
                setState(() => _lowercase = v);
                _generate();
              },
            ),
            SwitchListTile(
              title: const Text('Numbers (0-9)'),
              value: _numbers,
              dense: true,
              onChanged: (v) {
                setState(() => _numbers = v);
                _generate();
              },
            ),
            SwitchListTile(
              title: const Text('Symbols (!@#\$%^&*)'),
              value: _symbols,
              dense: true,
              onChanged: (v) {
                setState(() => _symbols = v);
                _generate();
              },
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, _password),
              child: const Text('Use This Password'),
            ),
          ],
        ),
      ),
    );
  }
}
