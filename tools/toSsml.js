module.exports = text =>
  `<s>${text
    .replace(/(?<![A-Z])([.!?]) +(?!$)/g, '$1</s><s>')
    .replace(/\n/g, '  \n')
    .replace(/(,| -) /g, '$1<break time="0.2s"/> ')}</s>`;
