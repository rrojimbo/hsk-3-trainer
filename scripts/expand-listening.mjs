import fs from 'node:fs'
import path from 'node:path'
import { pinyin } from 'pinyin-pro'

const IN_PATH = path.resolve('src', 'data', 'listening.json')

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8')
}

function zhPinyin(text) {
  return pinyin(text, { toneType: 'symbol', type: 'array' }).join(' ')
}

function nextId(items) {
  return Math.max(0, ...items.map((x) => Number(x.id) || 0)) + 1
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function main() {
  const existing = readJson(IN_PATH)
  const targetTotal = 100
  if (existing.length >= targetTotal) {
    console.log(`Уже достаточно: ${existing.length}`)
    return
  }

  let id = nextId(existing)
  const out = [...existing]

  // Банки фраз (HSK3-стиль), чтобы задания были разнообразными.
  const tfBank = [
    {
      text_zh: '今天我得早点儿睡，明天还要考试。',
      statement_zh: '明天要考试。',
      statement_ru: 'Завтра экзамен.',
      answer: true,
    },
    {
      text_zh: '这家店的东西不贵，但是人很多。',
      statement_zh: '这家店很贵。',
      statement_ru: 'Этот магазин дорогой.',
      answer: false,
    },
    {
      text_zh: '我把钱包忘在家里了，所以没买东西。',
      statement_zh: '他买了很多东西。',
      statement_ru: 'Он купил много вещей.',
      answer: false,
    },
    {
      text_zh: '如果你有空，我们周末一起去公园。',
      statement_zh: '他们周末想去公园。',
      statement_ru: 'Они хотят пойти в парк на выходных.',
      answer: true,
    },
    {
      text_zh: '外面有点儿冷，你多穿点儿衣服。',
      statement_zh: 'На улице немного холодно.',
      statement_ru: 'На улице немного холодно.',
      answer: true,
    },
    {
      text_zh: '因为堵车了，所以我迟到了。',
      statement_zh: 'Он опоздал из-за пробок.',
      statement_ru: 'Он опоздал из-за пробок.',
      answer: true,
    },
    {
      text_zh: '我最喜欢的季节是春天。',
      statement_zh: '他最喜欢冬天。',
      statement_ru: 'Ему больше всего нравится зима.',
      answer: false,
    },
    {
      text_zh: '他一到家就开始做饭。',
      statement_zh: 'Он сначала отдыхал дома.',
      statement_ru: 'Он сначала отдыхал дома.',
      answer: false,
    },
    {
      text_zh: '这件衣服有点儿大，我想换一件。',
      statement_zh: 'Эта одежда слишком маленькая.',
      statement_ru: 'Эта одежда слишком маленькая.',
      answer: false,
    },
    {
      text_zh: '对我来说，坐地铁比较方便。',
      statement_zh: 'Для него удобнее ехать на метро.',
      statement_ru: 'Для него удобнее ехать на метро.',
      answer: false,
    },
  ]

  const picBank = [
    {
      description_zh: '一个人坐在桌子前学习，桌子上有书和笔。',
      question_zh: '这个人在做什么？',
      question_ru: 'Что делает этот человек?',
      options_zh: ['学习', '睡觉', '做饭', '跑步'],
      options_ru: ['учится', 'спит', 'готовит', 'бегает'],
      answer: 0,
    },
    {
      description_zh: '一个女的在车站等公交车，手里拿着手机。',
      question_zh: '女的可能在等什么？',
      question_ru: 'Чего она, вероятно, ждёт?',
      options_zh: ['公交车', '朋友', '医生', '电影'],
      options_ru: ['автобус', 'друга', 'врача', 'фильм'],
      answer: 0,
    },
    {
      description_zh: '两个人在饭馆点菜，桌子上有菜单。',
      question_zh: '他们在哪里？',
      question_ru: 'Где они находятся?',
      options_zh: ['饭馆', '银行', '教室', '机场'],
      options_ru: ['в ресторане', 'в банке', 'в классе', 'в аэропорту'],
      answer: 0,
    },
    {
      description_zh: '一个男的在医院门口，手里拿着药。',
      question_zh: '他可能刚做了什么？',
      question_ru: 'Что он, вероятно, только что сделал?',
      options_zh: ['看医生', '买衣服', '上课', '看电影'],
      options_ru: ['сходил к врачу', 'купил одежду', 'был на уроке', 'смотрел фильм'],
      answer: 0,
    },
    {
      description_zh: '桌子上有一张票和一杯茶。',
      question_zh: '桌子上有什么？',
      question_ru: 'Что на столе?',
      options_zh: ['票和茶', '书和笔', '手机和电脑', '水果和牛奶'],
      options_ru: ['билет и чай', 'книга и ручка', 'телефон и компьютер', 'фрукты и молоко'],
      answer: 0,
    },
    {
      description_zh: '一个人拿着雨伞，在雨里走。',
      question_zh: '外面天气怎么样？',
      question_ru: 'Какая погода на улице?',
      options_zh: ['下雨', '下雪', '很热', '刮风'],
      options_ru: ['идёт дождь', 'идёт снег', 'жарко', 'ветрено'],
      answer: 0,
    },
    {
      description_zh: '一个男的在超市买水果，手里拿着苹果。',
      question_zh: '男的在买什么？',
      question_ru: 'Что покупает мужчина?',
      options_zh: ['水果', '衣服', '药', '书'],
      options_ru: ['фрукты', 'одежду', 'лекарства', 'книги'],
      answer: 0,
    },
    {
      description_zh: '一个女的在家做饭，旁边有孩子。',
      question_zh: '女的在做什么？',
      question_ru: 'Что делает женщина?',
      options_zh: ['做饭', '学习', '睡觉', '看医生'],
      options_ru: ['готовит', 'учится', 'спит', 'идёт к врачу'],
      answer: 0,
    },
    {
      description_zh: '两个人在地铁站看地图。',
      question_zh: '他们可能要做什么？',
      question_ru: 'Что они, вероятно, собираются сделать?',
      options_zh: ['坐地铁', '坐飞机', '看电影', '去医院'],
      options_ru: ['поехать на метро', 'полететь на самолёте', 'смотреть фильм', 'пойти в больницу'],
      answer: 0,
    },
    {
      description_zh: '一个学生在教室里举手问问题。',
      question_zh: '学生在做什么？',
      question_ru: 'Что делает студент?',
      options_zh: ['问问题', '睡觉', '吃饭', '跑步'],
      options_ru: ['задаёт вопрос', 'спит', 'ест', 'бегает'],
      answer: 0,
    },
  ]

  const dlgBank = [
    {
      dialogue_zh: '男：你怎么不高兴？\n女：因为我把手机丢了。',
      question_zh: '女的为什么不高兴？',
      question_ru: 'Почему женщина не рада?',
      options_zh: ['手机丢了', '下雨了', '迟到了', '想睡觉'],
      options_ru: ['потеряла телефон', 'пошёл дождь', 'опоздала', 'хочет спать'],
      answer: 0,
    },
    {
      dialogue_zh: '女：你要喝点儿什么？\n男：给我一杯茶吧。',
      question_zh: '男的想喝什么？',
      question_ru: 'Что хочет выпить мужчина?',
      options_zh: ['茶', '咖啡', '水', '牛奶'],
      options_ru: ['чай', 'кофе', 'воду', 'молоко'],
      answer: 0,
    },
    {
      dialogue_zh: '男：我们走路还是坐车？\n女：太远了，坐车吧。',
      question_zh: '他们怎么去？',
      question_ru: 'Как они поедут?',
      options_zh: ['坐车', '走路', '坐飞机', '骑车'],
      options_ru: ['на транспорте', 'пешком', 'на самолёте', 'на велосипеде'],
      answer: 0,
    },
    {
      dialogue_zh: '女：你什么时候有空？\n男：只有星期天才有空。',
      question_zh: '男的什么时候有空？',
      question_ru: 'Когда мужчина свободен?',
      options_zh: ['星期天', '星期六', '今天', '明天'],
      options_ru: ['в воскресенье', 'в субботу', 'сегодня', 'завтра'],
      answer: 0,
    },
    {
      dialogue_zh: '男：这件衣服怎么样？\n女：颜色我不太喜欢。',
      question_zh: '女的觉得这件衣服怎么样？',
      question_ru: 'Что женщина думает об одежде?',
      options_zh: ['不喜欢颜色', '太小', '太便宜', '质量不好'],
      options_ru: ['не нравится цвет', 'слишком маленькая', 'слишком дешёвая', 'плохое качество'],
      answer: 0,
    },
    {
      dialogue_zh: '女：你为什么迟到了？\n男：因为堵车了。',
      question_zh: '男的为什么迟到了？',
      question_ru: 'Почему мужчина опоздал?',
      options_zh: ['堵车', '生病', '下雨', '睡过头'],
      options_ru: ['пробки', 'болезнь', 'дождь', 'проспал'],
      answer: 0,
    },
    {
      dialogue_zh: '男：明天的考试你准备好了吗？\n女：还没有，我晚上再复习一下。',
      question_zh: '女的晚上要做什么？',
      question_ru: 'Что женщина будет делать вечером?',
      options_zh: ['复习', '看电影', '做饭', '睡觉'],
      options_ru: ['повторять', 'смотреть фильм', 'готовить', 'спать'],
      answer: 0,
    },
    {
      dialogue_zh: '女：你吃饱了吗？\n男：已经吃饱了，谢谢。',
      question_zh: '男的现在怎么样？',
      question_ru: 'Как сейчас мужчина?',
      options_zh: ['吃饱了', '很饿', '不舒服', '想买东西'],
      options_ru: ['наелся', 'очень голоден', 'плохо себя чувствует', 'хочет купить вещи'],
      answer: 0,
    },
    {
      dialogue_zh: '男：我们先去哪儿？\n女：先去银行，然后去超市。',
      question_zh: '女的先去哪儿？',
      question_ru: 'Куда женщина пойдёт сначала?',
      options_zh: ['银行', '超市', '学校', '公园'],
      options_ru: ['в банк', 'в супермаркет', 'в школу', 'в парк'],
      answer: 0,
    },
    {
      dialogue_zh: '女：你怎么来学校的？\n男：我坐地铁来的。',
      question_zh: '男的是怎么来学校的？',
      question_ru: 'Как мужчина добрался до школы?',
      options_zh: ['坐地铁', '坐公交车', '走路', '坐出租车'],
      options_ru: ['на метро', 'на автобусе', 'пешком', 'на такси'],
      answer: 0,
    },
  ]

  const need = targetTotal - out.length
  const each = Math.ceil(need / 3)

  const makeTF = () => {
    const base = tfBank[out.length % tfBank.length]
    const text_pinyin = zhPinyin(base.text_zh)
    return {
      id: id++,
      type: 'true_false',
      text_zh: base.text_zh,
      text_pinyin,
      statement_zh: base.statement_zh,
      statement_ru: base.statement_ru,
      answer: base.answer,
    }
  }

  const makePic = () => {
    const base = picBank[out.length % picBank.length]
    return {
      id: id++,
      type: 'picture_description',
      description_zh: base.description_zh,
      description_pinyin: zhPinyin(base.description_zh),
      question_zh: base.question_zh,
      question_ru: base.question_ru,
      options_zh: base.options_zh,
      options_ru: base.options_ru,
      answer: base.answer,
    }
  }

  const makeDlg = () => {
    const base = dlgBank[out.length % dlgBank.length]
    return {
      id: id++,
      type: 'dialogue_question',
      dialogue_zh: base.dialogue_zh,
      dialogue_pinyin: base.dialogue_zh
        .split('\n')
        .map((l) => zhPinyin(l))
        .join('\n'),
      question_zh: base.question_zh,
      question_ru: base.question_ru,
      options_zh: base.options_zh,
      options_ru: base.options_ru,
      answer: base.answer,
    }
  }

  for (let i = 0; i < each && out.length < targetTotal; i++) out.push(makeTF())
  for (let i = 0; i < each && out.length < targetTotal; i++) out.push(makePic())
  for (let i = 0; i < each && out.length < targetTotal; i++) out.push(makeDlg())

  // Если вдруг всё ещё не дотянули — добиваем true/false
  while (out.length < targetTotal) out.push(makeTF())

  // Перемешаем добавленные блоки, но сохраним уже существующие первые 40 как есть
  const head = out.slice(0, existing.length)
  const tail = shuffle(out.slice(existing.length))
  const final = [...head, ...tail].map((x, i) => ({ ...x, id: i + 1 }))

  writeJson(IN_PATH, final)

  const counts = final.reduce((m, x) => ((m[x.type] = (m[x.type] || 0) + 1), m), {})
  console.log(JSON.stringify({ total: final.length, counts }, null, 2))
}

main()

