// Inlines everything into two files in dist/:
//   index.html     full page at the repo root, opens from a phone or laptop with no server
//   artifact.html  same page without the html/head/body wrapper (for hosting as an artifact)
const fs = require('fs');
const rd = f => fs.readFileSync('src/' + f, 'utf8');
const head =
`<title>Java Full Stack Tracker</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="color-scheme" content="light dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=JetBrains+Mono:wght@400;600&family=Source+Sans+3:wght@400;600;700&display=swap">
<style>
${rd('styles.css')}
</style>
`;
const body =
`<div id="app"></div>
<noscript>This tracker needs JavaScript.</noscript>
<script>
${rd('syllabus.js')}
</script>
<script>
${rd('logic.js')}
</script>
<script>
${rd('app.js')}
</script>
`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/artifact.html', head + body);
fs.writeFileSync('index.html',
`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}</head>
<body>
${body}</body>
</html>
`);
console.log('built', fs.statSync('index.html').size, 'bytes');
