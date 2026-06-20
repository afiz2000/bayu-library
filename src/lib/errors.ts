const ORA_MESSAGES: Record<string, string> = {
  "00001": "This ID or value already exists. Please use a different one.",
  "01400": "A required field is missing.",
  "01722": "One of the values entered is not a valid number.",
  "01858": "Invalid date format.",
  "01861": "Invalid date format.",
  "02290": "This value does not meet the required format or range.",
  "02291": "The referenced record does not exist. Check the ID you entered.",
  "02292": "Cannot delete this record because other records still reference it.",
  "12899": "One of the values entered is too long for this field.",
  "20001": "This book has no available copies right now.",
};

export function toFriendlyMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  const oraMatch = message.match(/ORA-(\d{5})/);
  if (oraMatch) {
    return ORA_MESSAGES[oraMatch[1]] ?? "A database error occurred. Please check your input and try again.";
  }

  if (/^(NJS|DPI)-/.test(message)) {
    return "A database connection error occurred. Please try again shortly.";
  }

  return message;
}
