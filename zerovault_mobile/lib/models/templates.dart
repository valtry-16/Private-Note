/// Personal info template definitions — matches the 8 web app templates.

enum TemplateType {
  personalId,
  bankCard,
  bankAccount,
  cryptoWallet,
  wifiPassword,
  apiKey,
  document,
  other,
}

class TemplateField {
  final String key;
  final String label;
  final String hint;
  final bool isSecret;
  final bool multiline;

  const TemplateField({
    required this.key,
    required this.label,
    this.hint = '',
    this.isSecret = false,
    this.multiline = false,
  });
}

class PersonalTemplate {
  final TemplateType type;
  final String name;
  final String icon;
  final List<TemplateField> fields;

  const PersonalTemplate({
    required this.type,
    required this.name,
    required this.icon,
    required this.fields,
  });
}

const List<PersonalTemplate> personalTemplates = [
  PersonalTemplate(
    type: TemplateType.personalId,
    name: 'Personal ID',
    icon: 'badge',
    fields: [
      TemplateField(key: 'id_type', label: 'ID Type', hint: 'Passport, Driver License, etc.'),
      TemplateField(key: 'id_number', label: 'ID Number', isSecret: true),
      TemplateField(key: 'full_name', label: 'Full Name'),
      TemplateField(key: 'date_of_birth', label: 'Date of Birth'),
      TemplateField(key: 'expiry_date', label: 'Expiry Date'),
      TemplateField(key: 'issuing_authority', label: 'Issuing Authority'),
      TemplateField(key: 'notes', label: 'Notes', multiline: true),
    ],
  ),
  PersonalTemplate(
    type: TemplateType.bankCard,
    name: 'Bank Card',
    icon: 'credit_card',
    fields: [
      TemplateField(key: 'card_name', label: 'Card Name'),
      TemplateField(key: 'card_number', label: 'Card Number', isSecret: true),
      TemplateField(key: 'cardholder_name', label: 'Cardholder Name'),
      TemplateField(key: 'expiry_date', label: 'Expiry Date'),
      TemplateField(key: 'cvv', label: 'CVV', isSecret: true),
      TemplateField(key: 'pin', label: 'PIN', isSecret: true),
      TemplateField(key: 'notes', label: 'Notes', multiline: true),
    ],
  ),
  PersonalTemplate(
    type: TemplateType.bankAccount,
    name: 'Bank Account',
    icon: 'account_balance',
    fields: [
      TemplateField(key: 'bank_name', label: 'Bank Name'),
      TemplateField(key: 'account_number', label: 'Account Number', isSecret: true),
      TemplateField(key: 'routing_number', label: 'Routing Number'),
      TemplateField(key: 'iban', label: 'IBAN', isSecret: true),
      TemplateField(key: 'swift_bic', label: 'SWIFT/BIC'),
      TemplateField(key: 'account_type', label: 'Account Type'),
      TemplateField(key: 'notes', label: 'Notes', multiline: true),
    ],
  ),
  PersonalTemplate(
    type: TemplateType.cryptoWallet,
    name: 'Crypto Wallet',
    icon: 'currency_bitcoin',
    fields: [
      TemplateField(key: 'wallet_name', label: 'Wallet Name'),
      TemplateField(key: 'wallet_address', label: 'Wallet Address'),
      TemplateField(key: 'private_key', label: 'Private Key', isSecret: true),
      TemplateField(key: 'seed_phrase', label: 'Seed Phrase', isSecret: true, multiline: true),
      TemplateField(key: 'network', label: 'Network'),
      TemplateField(key: 'notes', label: 'Notes', multiline: true),
    ],
  ),
  PersonalTemplate(
    type: TemplateType.wifiPassword,
    name: 'WiFi Password',
    icon: 'wifi',
    fields: [
      TemplateField(key: 'network_name', label: 'Network Name (SSID)'),
      TemplateField(key: 'password', label: 'Password', isSecret: true),
      TemplateField(key: 'security_type', label: 'Security Type', hint: 'WPA2, WPA3, etc.'),
      TemplateField(key: 'notes', label: 'Notes', multiline: true),
    ],
  ),
  PersonalTemplate(
    type: TemplateType.apiKey,
    name: 'API Key',
    icon: 'vpn_key',
    fields: [
      TemplateField(key: 'service_name', label: 'Service Name'),
      TemplateField(key: 'api_key', label: 'API Key', isSecret: true),
      TemplateField(key: 'api_secret', label: 'API Secret', isSecret: true),
      TemplateField(key: 'endpoint', label: 'Endpoint URL'),
      TemplateField(key: 'notes', label: 'Notes', multiline: true),
    ],
  ),
  PersonalTemplate(
    type: TemplateType.document,
    name: 'Document',
    icon: 'description',
    fields: [
      TemplateField(key: 'document_name', label: 'Document Name'),
      TemplateField(key: 'document_number', label: 'Document Number', isSecret: true),
      TemplateField(key: 'issuing_authority', label: 'Issuing Authority'),
      TemplateField(key: 'issue_date', label: 'Issue Date'),
      TemplateField(key: 'expiry_date', label: 'Expiry Date'),
      TemplateField(key: 'notes', label: 'Notes', multiline: true),
    ],
  ),
  PersonalTemplate(
    type: TemplateType.other,
    name: 'Other',
    icon: 'more_horiz',
    fields: [
      TemplateField(key: 'title', label: 'Title'),
      TemplateField(key: 'field_1', label: 'Field 1'),
      TemplateField(key: 'field_2', label: 'Field 2'),
      TemplateField(key: 'field_3', label: 'Field 3', isSecret: true),
      TemplateField(key: 'notes', label: 'Notes', multiline: true),
    ],
  ),
];

PersonalTemplate getTemplate(TemplateType type) {
  return personalTemplates.firstWhere((t) => t.type == type);
}
