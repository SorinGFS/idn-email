/**
 * Validate an idn-email address. Returns true or throws a detailed error.
 *
 * @throws {SyntaxError}
 */
declare function isIdnEmail(email: string): true;

/**
 * Returns the ACE hostname based idn-email or throws a detailed error (it also validates the input)
 *
 * @throws {SyntaxError}
 */
declare function idnEmail(email: string): string;

declare const IdnEmail: {
  isIdnEmail: typeof isIdnEmail;
  idnEmail: typeof idnEmail;
};

export = IdnEmail;
