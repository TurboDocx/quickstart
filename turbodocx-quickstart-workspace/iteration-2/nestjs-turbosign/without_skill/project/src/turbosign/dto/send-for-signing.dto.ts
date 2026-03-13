export class SignerDto {
  name: string;
  email: string;
}

export class SendForSigningDto {
  /** The ID of a previously uploaded document in TurboDocx */
  documentId: string;

  /** Display name shown in the signing request */
  documentName?: string;

  /** Message included in the signing email */
  message?: string;

  /** List of signers who should receive the document */
  signers: SignerDto[];
}
