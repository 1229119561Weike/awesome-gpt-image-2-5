import {loadData, validateData} from './lib.mjs';
try {
  const data = await loadData();
  const errors = validateData(data);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`校验通过：${data.cases.length} 条来源记录，${data.templates.length} 个原创模板。`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
