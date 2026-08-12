import { NextResponse } from 'next/server';
import { RegistrationError, registerUser } from '@/auth/register';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json(
      { error: 'invalid_input', message: 'email и password обязательны.' },
      { status: 400 },
    );
  }

  try {
    const user = await registerUser(email, password);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof RegistrationError) {
      const status = error.code === 'email_taken' ? 409 : 400;
      return NextResponse.json({ error: error.code, message: error.message }, { status });
    }
    throw error;
  }
}
