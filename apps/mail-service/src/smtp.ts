import { createConnection, type Socket } from 'node:net';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

function readResponse(socket: Socket | TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      cleanup();
      resolve(chunk.toString());
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
    };
    socket.once('data', onData);
    socket.once('error', onError);
  });
}

async function sendCmd(socket: Socket | TLSSocket, cmd: string): Promise<string> {
  socket.write(`${cmd}\r\n`);
  return readResponse(socket);
}

function expectCode(resp: string, code: string): void {
  if (!resp.startsWith(code)) {
    throw new Error(`SMTP error: ${resp.trim()}`);
  }
}

export async function sendMail(
  config: SmtpConfig,
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  const socket: Socket | TLSSocket = config.secure
    ? tlsConnect({ host: config.host, port: config.port, rejectUnauthorized: true })
    : createConnection({ host: config.host, port: config.port });

  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject);
    socket.once('connect', () => resolve());
  });

  try {
    expectCode(await readResponse(socket), '220');
    expectCode(await sendCmd(socket, `EHLO ${config.host}`), '250');

    if (!config.secure && config.port === 587) {
      expectCode(await sendCmd(socket, 'STARTTLS'), '220');
      const upgraded = tlsConnect({ socket, rejectUnauthorized: true });
      await new Promise<void>((resolve, reject) => {
        upgraded.once('secureConnect', () => resolve());
        upgraded.once('error', reject);
      });
      expectCode(await sendCmd(upgraded, `EHLO ${config.host}`), '250');
      expectCode(await sendCmd(upgraded, 'AUTH LOGIN'), '334');
      expectCode(await sendCmd(upgraded, Buffer.from(config.user).toString('base64')), '334');
      expectCode(await sendCmd(upgraded, Buffer.from(config.pass).toString('base64')), '235');
      expectCode(await sendCmd(upgraded, `MAIL FROM:<${config.from}>`), '250');
      expectCode(await sendCmd(upgraded, `RCPT TO:<${to}>`), '250');
      expectCode(await sendCmd(upgraded, 'DATA'), '354');

      const boundary = `----TimesheetApp${Date.now()}`;
      const body = [
        `From: ${config.from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        text,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        html,
        '',
        `--${boundary}--`,
        '.',
      ].join('\r\n');

      expectCode(await sendCmd(upgraded, body), '250');
      await sendCmd(upgraded, 'QUIT');
      upgraded.end();
      return;
    }

    if (config.user) {
      expectCode(await sendCmd(socket, 'AUTH LOGIN'), '334');
      expectCode(await sendCmd(socket, Buffer.from(config.user).toString('base64')), '334');
      expectCode(await sendCmd(socket, Buffer.from(config.pass).toString('base64')), '235');
    }

    expectCode(await sendCmd(socket, `MAIL FROM:<${config.from}>`), '250');
    expectCode(await sendCmd(socket, `RCPT TO:<${to}>`), '250');
    expectCode(await sendCmd(socket, 'DATA'), '354');

    const boundary = `----TimesheetApp${Date.now()}`;
    const body = [
      `From: ${config.from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      text,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      html,
      '',
      `--${boundary}--`,
      '.',
    ].join('\r\n');

    expectCode(await sendCmd(socket, body), '250');
    await sendCmd(socket, 'QUIT');
  } finally {
    socket.end();
  }
}
