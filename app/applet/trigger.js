async function run() {
  const res = await fetch("http://localhost:3000/api/carelink/test", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: "lukcorp83@gmail.com", password: "fakepassword", region: "EU" })
  });
  console.log(await res.json());
}
run();
