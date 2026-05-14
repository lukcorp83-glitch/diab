import { 
  startRegistration, 
  startAuthentication 
} from '@simplewebauthn/browser';

export async function registerPasskey(getAccessToken: () => Promise<string>) {
  try {
    const token = await getAccessToken();
    const resp = await fetch('/api/webauthn/register-options', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!resp.ok) throw new Error('Nie udało się pobrać opcji rejestracji');
    
    const options = await resp.json();
    const attResp = await startRegistration(options);
    
    const verifyResp = await fetch('/api/webauthn/register-verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(attResp)
    });
    
    const verification = await verifyResp.json();
    if (verification.verified) {
      return { success: true };
    } else {
      throw new Error(verification.error || 'Weryfikacja nieudana');
    }
  } catch (e: any) {
    console.error(e);
    throw e;
  }
}

export async function loginWithPasskey(email: string) {
  try {
    const resp = await fetch('/api/webauthn/login-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Nie udało się pobrać opcji logowania');
    }
    
    const options = await resp.json();
    const { loginChallengeId, ...authOptions } = options;
    
    const assertion = await startAuthentication(authOptions);
    
    const verifyResp = await fetch('/api/webauthn/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        response: assertion, 
        loginChallengeId 
      })
    });
    
    const verification = await verifyResp.json();
    if (verification.verified && verification.customToken) {
      return { success: true, customToken: verification.customToken };
    } else {
      throw new Error(verification.error || 'Błąd weryfikacji biometrii');
    }
  } catch (e: any) {
    console.error(e);
    throw e;
  }
}
