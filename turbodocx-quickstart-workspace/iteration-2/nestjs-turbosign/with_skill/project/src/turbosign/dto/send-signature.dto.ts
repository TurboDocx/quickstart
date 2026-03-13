// DTO for the send-signature request body.
// Recipients and fields are sent as JSON strings when using multipart/form-data.

export class SendSignatureDto {
  documentName: string;
  recipients: string; // JSON string — parsed in the controller
  fields: string;     // JSON string — parsed in the controller
}
