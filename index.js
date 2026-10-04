
import { program } from 'commander';
import fs from 'node:fs';


// опис програми

program
  .name('survey')
  .description('CLI-програма для роботи з опитуванням про музику')
  .version('1.0.0')
  .option('-f, --file <path>', 'шлях до JSON-файлу', 'data.json');

//допоміжні функції

// Читає JSON-файл і повертає розпарсений об'єкт

function loadData(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    console.error(` не вдалося прочитати файл "${filePath}"`);
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch {
    console.error(`файл "${filePath}" містить некоректний JSON`);
    process.exit(1);
  }
}

// Дістати значення за шляхом 

function getByPath(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return { found: false, value: undefined };
    }
    if (typeof current !== 'object' || !(part in current)) {
      return { found: false, value: undefined };
    }
    current = current[part];
  }
  return { found: true, value: current };
}

// Форматує значення для виводу
function formatValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

//  list — стислий перелік питань 

program
  .command('list')
  .description('Показати стислий перелік питань')
  .option('-n, --limit <count>', 'обмежити кількість питань', '10')
  .action((options) => {
    const data = loadData(program.opts().file);

    const limit = Number(options.limit);
    if (!Number.isInteger(limit) || limit <= 0) {
      console.error('Помилка: значення --limit має бути додатним цілим числом');
      process.exit(1);
    }

    const questions = data.questions.slice(0, limit);
    console.log(`Перелік питань (показано ${questions.length} з ${data.questions.length}):`);
    for (const q of questions) {
      const required = q.isRequired ? 'обов\'язкове' : 'необов\'язкове';
      console.log(`  [${q.questionId}] ${q.text} (${q.type}, ${required})`);
    }
  });


//  show — одне питання цілком 
program
  .command('show')
  .description('Показати одне питання цілком за його ідентифікатором')
  .argument('<questionId>', 'ідентифікатор питання')
  .action((questionId) => {
    const data = loadData(program.opts().file);

    const id = Number(questionId);
    if (!Number.isInteger(id)) {
      console.error('Помилка: ідентифікатор питання має бути цілим числом');
      process.exit(1);
    }

    const question = data.questions.find((q) => q.questionId === id);
    if (!question) {
      console.error(`Помилка: питання з ідентифікатором ${id} не знайдено`);
      process.exit(1);
    }

    console.log(`Питання ${question.questionId}:`);
    console.log(JSON.stringify(question, null, 2));
  });


//  field — окреме поле питання 

program
  .command('field')
  .description('Показати значення окремого поля питання, зокрема вкладеного')
  .argument('<questionId>', 'ідентифікатор питання')
  .argument('<path>', 'шлях до поля, напр. text, type, options.0')
  .action((questionId, path) => {
    const data = loadData(program.opts().file);

    const id = Number(questionId);
    if (!Number.isInteger(id)) {
      console.error('Помилка: ідентифікатор питання має бути цілим числом');
      process.exit(1);
    }

    const question = data.questions.find((q) => q.questionId === id);
    if (!question) {
      console.error(`Помилка: питання з ідентифікатором ${id} не знайдено`);
      process.exit(1);
    }
   
    const result = getByPath(question, path);

    if (!result.found) {
      console.error(`Помилка: поле "${path}" відсутнє у питанні ${id}`);
      process.exit(1);
    }

    if (result.value === null) {
      console.log('Значення поля: null');
      return;
    }

    console.log(`Значення поля "${path}":`);
    console.log(formatValue(result.value));
  });


program.parse();