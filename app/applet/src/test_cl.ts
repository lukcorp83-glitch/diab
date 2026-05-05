import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function testLogin() {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      jar: jar,
      withCredentials: true,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Upgrade-Insecure-Requests': '1'
      }
    }));

    const baseUrl = 'https://carelink.minimed.eu';
    let initResponse = await client.get(`${baseUrl}/patient/sso/login?country=pl&lang=pl`, { maxRedirects: 15 });
    
    let content = initResponse.data.toString();
    console.log("init response status", initResponse.status);
    let currentUrl = (initResponse.request as any)?.res?.responseUrl || initResponse.config.url || baseUrl;
    let forms = [...content.matchAll(/<form\s+[^>]*>/gi)].map(m => m[0]);
    let actionUrl = null;
    for (const formStr of forms) {
        const actionMatch = formStr.match(/\saction=["']([^"']+)["']/i);
        if (actionMatch) { actionUrl = actionMatch[1]; }
    }
    const finalActionUrl = actionUrl || currentUrl;
    console.log("Final action url", finalActionUrl);
    
    const params = new URLSearchParams();
    const inputs = content.matchAll(/<(input|button)\s+([^>]+)>/gi);
    for (const inputMatch of inputs) {
        const tagType = inputMatch[1].toLowerCase();
        const tagAttrs = inputMatch[2];
        if (tagType === 'input' && /type=["']hidden["']/i.test(tagAttrs)) {
        const nameMatch = tagAttrs.match(/name=["']([^"']+)["']/i);
        const valueMatch = tagAttrs.match(/value=["']([^"']*)["']/i);
        if (nameMatch) params.append(nameMatch[1], valueMatch ? valueMatch[1] : '');
        }
        if (tagType === 'button' && /type=["']submit["']/i.test(tagAttrs)) {
            const nameMatch = tagAttrs.match(/name=["']([^"']+)["']/i);
            const valueMatch = tagAttrs.match(/value=["']([^"']*)["']/i);
            if (nameMatch) params.append(nameMatch[1], valueMatch ? valueMatch[1] : '');
        }
    }
    params.append('username', 'testuser');
    params.append('password', 'testuser');
    
    const postResponse = await client.post(finalActionUrl, params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': currentUrl,
            'Origin': new URL(currentUrl).origin,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Cache-Control': 'max-age=0'
        },
        maxRedirects: 15,
        validateStatus: (s) => s >= 200 && s < 500
    });
    
    console.log("post response status", postResponse.status);
    console.log("post content length", postResponse.data.length);
    console.log(postResponse.data.substring(0, 500));
}

testLogin().catch(console.error);
