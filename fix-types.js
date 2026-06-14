const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, regex, replacement) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content);
}

const dir = path.join(__dirname, 'src', 'components');

// Fix CosmicSquare.tsx
replaceInFile(
  path.join(dir, 'CosmicSquare.tsx'),
  /matchRes\.score/g,
  'matchRes.overall'
);

// Fix NearbyMatches.tsx
replaceInFile(
  path.join(dir, 'NearbyMatches.tsx'),
  /matchRes\.score/g,
  'matchRes.overall'
);
replaceInFile(
  path.join(dir, 'NearbyMatches.tsx'),
  /matchRes\.breakdown/g,
  'matchRes.sub'
);

// Fix StarTwin.tsx
replaceInFile(
  path.join(dir, 'StarTwin.tsx'),
  /setCustomMatch\(calculateMatch\(u, c\)\.result\);/g,
  'setCustomMatch(calculateMatch(u, c));'
);
replaceInFile(
  path.join(dir, 'StarTwin.tsx'),
  /title=\{t\.name\}/g,
  'title={t.nameTitle}'
);
replaceInFile(
  path.join(dir, 'StarTwin.tsx'),
  /const partnerChart = mode === 'celebrity' \? \{ sun: topCeleb\.celebrity\.sun_sign \} : calculateSigns\(partner!\.birth_date, partner!\.birth_time, partner!\.lat, partner!\.lon\);/g,
  `const partnerChart: any = mode === 'celebrity' ? { sun: topCeleb!.celebrity.sun_sign } : calculateSigns(partner!.birth_date, partner!.birth_time, partner!.lat, partner!.lon);`
);
replaceInFile(
  path.join(dir, 'StarTwin.tsx'),
  /const matchData = mode === 'celebrity' \? topCeleb\.result : customMatch;/g,
  `const matchData = mode === 'celebrity' ? topCeleb!.result : customMatch;`
);
replaceInFile(
  path.join(dir, 'StarTwin.tsx'),
  /const topName = mode === 'celebrity' \? nm\(topCeleb\.celebrity\) : \(partner\?\.name \|\| 'Partner'\);/g,
  `const topName = mode === 'celebrity' ? nm(topCeleb!.celebrity) : (partner?.name || 'Partner');`
);
replaceInFile(
  path.join(dir, 'StarTwin.tsx'),
  /const topBirth = mode === 'celebrity' \? topCeleb\.celebrity\.birth_date : partner!\.birth_date;/g,
  `const topBirth = mode === 'celebrity' ? topCeleb!.celebrity.birth_date : partner!.birth_date;`
);
replaceInFile(
  path.join(dir, 'StarTwin.tsx'),
  /const topFields = mode === 'celebrity' \? topCeleb\.celebrity\.fields : partner!\.fields;/g,
  `const topFields = mode === 'celebrity' ? topCeleb!.celebrity.fields : partner!.fields;`
);
replaceInFile(
  path.join(dir, 'StarTwin.tsx'),
  /const imageUrl = mode === 'celebrity' \? topCeleb\.celebrity\.image_url : undefined;/g,
  `const imageUrl = mode === 'celebrity' ? topCeleb!.celebrity.image_url : undefined;`
);
replaceInFile(
  path.join(dir, 'StarTwin.tsx'),
  /const share = async \(\) => {/g,
  `const [sharing, setSharing] = useState(false);\n  const share = async () => {`
);

console.log("Types fixed locally.");
