'use client';

import { useState } from 'react';

interface Recipient {
  name: string;
  email: string;
  signingOrder: number;
}

interface Field {
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  recipientEmail: string;
}

export default function Home() {
  const [fileLink, setFileLink] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [statusResult, setStatusResult] = useState('');
  const [sendResult, setSendResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSendResult('');

    try {
      const recipients: Recipient[] = [
        { name: recipientName, email: recipientEmail, signingOrder: 1 },
      ];

      const fields: Field[] = [
        {
          type: 'signature',
          page: 1,
          x: 100,
          y: 500,
          width: 200,
          height: 50,
          recipientEmail: recipientEmail,
        },
        {
          type: 'date',
          page: 1,
          x: 100,
          y: 560,
          width: 150,
          height: 30,
          recipientEmail: recipientEmail,
        },
      ];

      const response = await fetch('/api/turbosign/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileLink,
          recipients,
          fields,
          documentName: 'Document for Signature',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSendResult(`Error: ${data.error}`);
      } else {
        setDocumentId(data.documentId);
        setSendResult(
          `Sent! Document ID: ${data.documentId} — ${data.message}`
        );
      }
    } catch (err) {
      setSendResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckStatus() {
    if (!documentId) {
      setStatusResult('Enter a document ID first.');
      return;
    }

    setLoading(true);
    setStatusResult('');

    try {
      const response = await fetch(`/api/turbosign/status/${documentId}`);
      const data = await response.json();

      if (!response.ok) {
        setStatusResult(`Error: ${data.error}`);
      } else {
        setStatusResult(`Status: ${data.status}`);
      }
    } catch (err) {
      setStatusResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>TurboSign Demo</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Send Document for Signature</h2>
        <form onSubmit={handleSend}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label>
              PDF URL:
              <br />
              <input
                type="url"
                value={fileLink}
                onChange={(e) => setFileLink(e.target.value)}
                required
                placeholder="https://example.com/contract.pdf"
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label>
              Recipient Name:
              <br />
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                placeholder="Jane Doe"
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label>
              Recipient Email:
              <br />
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
                placeholder="jane@example.com"
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </label>
          </div>
          <button type="submit" disabled={loading} style={{ padding: '0.5rem 1.5rem' }}>
            {loading ? 'Sending...' : 'Send for Signature'}
          </button>
        </form>
        {sendResult && (
          <pre style={{ marginTop: '1rem', background: '#f4f4f4', padding: '1rem', whiteSpace: 'pre-wrap' }}>
            {sendResult}
          </pre>
        )}
      </section>

      <hr />

      <section style={{ marginTop: '2rem' }}>
        <h2>Check Document Status</h2>
        <div style={{ marginBottom: '0.75rem' }}>
          <label>
            Document ID:
            <br />
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="document-uuid"
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </label>
        </div>
        <button onClick={handleCheckStatus} disabled={loading} style={{ padding: '0.5rem 1.5rem' }}>
          {loading ? 'Checking...' : 'Check Status'}
        </button>
        {statusResult && (
          <pre style={{ marginTop: '1rem', background: '#f4f4f4', padding: '1rem', whiteSpace: 'pre-wrap' }}>
            {statusResult}
          </pre>
        )}
      </section>
    </main>
  );
}
