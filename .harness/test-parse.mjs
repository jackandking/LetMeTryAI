const content = `\`\`\`json
{
  "profileId": "nanrenbao",
  "topicCandidates": [{"title":"测试"}]
}
\`\`\``;

const jsonMatch = content.match(/\`\`\`json\s*([\s\S]*?)\`\`\`/) || 
                  content.match(/\`\`\`\s*([\s\S]*?)\`\`\`/);

if (jsonMatch) {
  console.log('Match found!');
  console.log('Extracted:', jsonMatch[1].slice(0, 200));
  try {
    const parsed = JSON.parse(jsonMatch[1].trim());
    console.log('✅ Parsed successfully:', parsed.profileId);
  } catch (e) {
    console.log('❌ Parse error:', e.message);
  }
} else {
  console.log('No match');
}
