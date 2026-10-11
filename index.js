
import { program } from 'commander';
import fs from 'node:fs';


// опис програми

program
  .name('survey')
  .description('CLI-програма для роботи з опитуванням про музику')
  .version('1.0.0');

program.requiredOption(
  '-f, --file <path>',
  'шлях до JSON-файлу з даними опитування'
);
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
      console.error('значення --limit має бути додатним цілим числом');
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


//questions  перелік з відбором 
program
  .command('questions')
  .description('Перелік питань з відбором за типом і обов\'язковістю')
  .option('-t, --type <type>', 'фільтр за типом (single, multiple, scale, text)')
  .option('-r, --required', 'показати лише обов\'язкові')
  .action((options) => {
    const data = loadData(program.opts().file);

    const validTypes = ['single', 'multiple', 'scale', 'text'];
    if (options.type && !validTypes.includes(options.type)) {
      console.error(
        `невідомий тип "${options.type}". Дозволені: ${validTypes.join(', ')}`
      );
      process.exit(1);
    }

    let questions = data.questions;

    if (options.type) {
      questions = questions.filter((q) => q.type === options.type);
    }

    if (options.required) {
      questions = questions.filter((q) => q.isRequired === true);
    }

    if (questions.length === 0) {
      console.log('Питань за заданими умовами не знайдено');
      return;
    }

    const filterDescription = [];
    if (options.type) filterDescription.push(`тип: ${options.type}`);
    if (options.required) filterDescription.push('лише обов\'язкові');
    const filterText = filterDescription.length > 0
      ? ` (${filterDescription.join(', ')})`
      : '';

    console.log(`Знайдено питань: ${questions.length}${filterText}`);
    for (const q of questions) {
      const required = q.isRequired ? 'обов\'язкове' : 'необов\'язкове';
      console.log(`  [${q.questionId}] ${q.text} (${q.type}, ${required})`);
    }
  });


  //answers — відповіді всіх на питання 

program
  .command('answers')
  .description('Відповіді всіх респондентів на обране питання')
  .argument('<questionId>', 'ідентифікатор питання')
  .action((questionId) => {
    const data = loadData(program.opts().file);

    const id = Number(questionId);
    if (!Number.isInteger(id)) {
      console.error('ідентифікатор питання має бути цілим числом');
      process.exit(1);
    }

    const question = data.questions.find((q) => q.questionId === id);
    if (!question) {
      console.error(`питання з ідентифікатором ${id} не знайдено`);
      process.exit(1);
    }

    console.log(`Питання ${question.questionId}: ${question.text}`);
    console.log('Відповіді:');

    let answeredCount = 0;
    for (const respondent of data.responses) {
      const answer = respondent.answers.find((a) => a.questionId === id);

      if (answer) {
        console.log(
          `  Респондент ${respondent.respondentId}: ${formatValue(answer.value)}`
        );
        answeredCount++;
      } else {
        console.log(
          `  Респондент ${respondent.respondentId}: (не відповів)`
        );
      }
    }

    if (answeredCount === 0) {
      console.log('  (жоден респондент не відповів на це питання)');
    }
  });

//  respondent — усі відповіді одного 

program
  .command('respondent')
  .description('Усі відповіді одного респондента разом із текстом питань')
  .argument('<id>', 'ідентифікатор респондента')
  .action((id) => {
    const data = loadData(program.opts().file);

    const respondentId = Number(id);
    if (!Number.isInteger(respondentId)) {
      console.error('ідентифікатор респондента має бути цілим числом');
      process.exit(1);
    }

    const respondent = data.responses.find(
      (r) => r.respondentId === respondentId
    );
    if (!respondent) {
      console.error(
        ` респондента з ідентифікатором ${respondentId} не знайдено`
      );
      process.exit(1);
    }

    console.log(
      `Респондент ${respondent.respondentId} (подано ${respondent.submittedDate}):`
    );
    console.log('Відповіді:');

    for (const answer of respondent.answers) {
      const question = data.questions.find(
        (q) => q.questionId === answer.questionId
      );
      const questionText = question
        ? question.text
        : `[питання ${answer.questionId} не знайдено]`;

      console.log(`  • ${questionText}`);
      console.log(`      → ${formatValue(answer.value)}`);
    }
  });
program.parse();