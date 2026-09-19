/**
 * Validate an RFC 5321/RFC 6531 SMTP mailbox address without changing its spelling.
 * Returns true or throws a detailed error.
 *
 * @throws {SyntaxError}
 */
declare function isIdnEmailAddress(emailAddress: string): true;

/**
 * Validate an SMTP mailbox address and return it with a strict U-label domain
 * converted to ASCII Compatible Encoding. The local part is preserved exactly.
 *
 * @throws {SyntaxError}
 */
declare function idnEmailAddress(emailAddress: string): string;

declare const IdnEmail: {
  isIdnEmailAddress: typeof isIdnEmailAddress;
  idnEmailAddress: typeof idnEmailAddress;
};

export = IdnEmail;
