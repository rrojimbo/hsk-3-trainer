import fs from 'node:fs'
import path from 'node:path'
import { pinyin } from 'pinyin-pro'

const WORDS_PATH = path.resolve('src', 'data', 'words.json')

function safeJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8')
}

function zhPinyin(text) {
  return pinyin(text, { toneType: 'symbol', type: 'array' }).join(' ')
}

function isRuVerb(ru) {
  const s = String(ru || '').toLowerCase()
  // Очень грубо, но покрывает многие русские инфинитивы
  return /\b(ать|ять|еть|ить|ыть|ть|ться)\b/.test(s) && !/\b(мочь|нужно|можно)\b/.test(s)
}

const functionWordTemplates = {
  因为: { zh: '因为下雨了，所以我没去。', ru: 'Потому что пошёл дождь, поэтому я не пошёл(а).' },
  所以: { zh: '我很忙，所以没时间。', ru: 'Я очень занят(а), поэтому нет времени.' },
  虽然: { zh: '虽然很累，但是我还是要学习。', ru: 'Хотя очень устал(а), я всё равно буду учиться.' },
  但是: { zh: '我想去，但是没时间。', ru: 'Я хочу пойти, но нет времени.' },
  如果: { zh: '如果明天下雨，我们就不去。', ru: 'Если завтра будет дождь, мы не пойдём.' },
  就: { zh: '我一到家就睡觉了。', ru: 'Как только я пришёл(пришла) домой, сразу уснул(а).' },
  还是: { zh: '你想喝茶还是咖啡？', ru: 'Ты хочешь чай или кофе?' },
  或者: { zh: '你今天或者明天来都可以。', ru: 'Ты можешь прийти сегодня или завтра.' },
  再: { zh: '请再说一遍。', ru: 'Пожалуйста, скажи ещё раз.' },
  又: { zh: '他又迟到了。', ru: 'Он снова опоздал.' },
  最: { zh: '我最喜欢春天。', ru: 'Больше всего мне нравится весна.' },
  比较: { zh: '这个问题比较难。', ru: 'Этот вопрос довольно сложный.' },
  有点儿: { zh: '这件衣服有点儿贵。', ru: 'Эта одежда немного дорогая.' },
  把: { zh: '请把门关上。', ru: 'Пожалуйста, закрой дверь.' },
  被: { zh: '我的手机被人偷了。', ru: 'Мой телефон украли.' },
}

const specialWordTemplates = {
  买: { zh: '我想买这个。', ru: 'Я хочу купить это.' },
  卖: { zh: '这家店卖水果。', ru: 'В этом магазине продают фрукты.' },
  男人: { zh: '他是男人。', ru: 'Он мужчина.' },
  女人: { zh: '她是女人。', ru: 'Она женщина.' },
  医院: { zh: '我不舒服，去医院看看。', ru: 'Мне нехорошо, схожу в больницу.' },
  个: { zh: '我买了一个苹果。', ru: 'Я купил(а) одно яблоко. (个 — счётное слово)' },
  本: { zh: '我有一本书。', ru: 'У меня есть одна книга. (本 — для книг)' },
  件: { zh: '我买了一件衣服。', ru: 'Я купил(а) одну вещь одежды. (件 — для одежды/дел)' },
  辆: { zh: '他有一辆车。', ru: 'У него есть одна машина. (辆 — для транспорта)' },
  张: { zh: '请给我一张纸。', ru: 'Дай мне, пожалуйста, один лист бумаги. (张 — для плоских предметов)' },
  杯: { zh: '我喝了一杯茶。', ru: 'Я выпил(а) одну чашку чая. (杯 — для напитков)' },
}

function classifierHanzi(classifiers) {
  if (!Array.isArray(classifiers) || classifiers.length === 0) return ''
  const first = String(classifiers[0])
  const m = first.match(/^([一-龥]{1,2})/)
  return m ? m[1] : ''
}

function pickTemplateVariants(word) {
  const t = word.topic
  const w = word.hanzi
  const ru = word.translation || 'это'

  if (specialWordTemplates[w]) return [specialWordTemplates[w]]
  if (functionWordTemplates[w]) return [functionWordTemplates[w]]

  // Глаголы — без "的{w}"
  if (isRuVerb(ru)) {
    // типовые экзаменные глагольные рамки
    if (t === 'покупки') {
      return [{ zh: `我想${w}这个。`, ru: `Я хочу ${ru} это.` }]
    }
    if (t === 'транспорт') {
      return [{ zh: `我会${w}到地铁站。`, ru: `Я могу ${ru} до станции метро.` }]
    }
    return [
      { zh: `我想${w}一下。`, ru: `Я хочу ${ru} немного.` },
      { zh: `我${w}得很认真。`, ru: `Я ${ru} очень внимательно.` },
      { zh: `我们一起${w}吧。`, ru: `Давай вместе ${ru}.` },
    ]
  }

  // Если есть счетное слово — используем его, это очень помогает запоминанию
  const cl = classifierHanzi(word.classifiers)
  if (cl) {
    return [
      { zh: `我有一${cl}${w}。`, ru: `У меня есть один/одна: ${ru}.` },
      { zh: `我想买一${cl}${w}。`, ru: `Я хочу купить один/одну: ${ru}.` },
      { zh: `这里有一${cl}${w}。`, ru: `Здесь есть один/одна: ${ru}.` },
    ]
  }

  // Люди/роли — нейтрально, без "мне нравится мужчина"
  if (/(мужчина|женщина|учитель|студент|врач|папа|мама|ребенок|друг)/i.test(ru)) {
    return [
      { zh: `他是${w}。`, ru: `Он: ${ru}.` },
      { zh: `她不是${w}。`, ru: `Она не: ${ru}.` },
      { zh: `我认识一个${w}。`, ru: `Я знаю одного/одну: ${ru}.` },
    ]
  }

  // Места — "иду в ..."
  if (/(больниц|школ|универ|магазин|ресторан|кафе|банк|почт|аэропорт|станц)/i.test(ru)) {
    return [
      { zh: `我去${w}。`, ru: `Я иду в/на: ${ru}.` },
      { zh: `我们在${w}见面吧。`, ru: `Давай встретимся в/на: ${ru}.` },
      { zh: `${w}离我家很近。`, ru: `${ru} рядом с моим домом.` },
    ]
  }

  // Более «живые» экзаменные фразы — короткие и нейтральные.
  switch (t) {
    case 'время':
      return [
        { zh: `我们${w}见面吧。`, ru: `Давай встретимся ${ru}.` },
        { zh: `我${w}很忙。`, ru: `Я ${ru} очень занят(а).` },
        { zh: `我${w}有时间。`, ru: `У меня ${ru} есть время.` },
      ]
    case 'транспорт':
      return [
        { zh: `我常常坐${w}去上班。`, ru: `Я часто езжу на ${ru} на работу.` },
        { zh: `去学校我坐${w}。`, ru: `В школу я еду на ${ru}.` },
        { zh: `${w}很方便。`, ru: `${ru} — это удобно.` },
      ]
    case 'здоровье':
      return [
        { zh: `我不舒服，需要${w}。`, ru: `Мне нехорошо, мне нужно: ${ru}.` },
        { zh: `为了${w}，我每天运动。`, ru: `Ради ${ru} я занимаюсь спортом каждый день.` },
        { zh: `医生说${w}很重要。`, ru: `Врач сказал, что ${ru} очень важно.` },
      ]
    case 'покупки':
      return [
        { zh: `我想买${w}。`, ru: `Я хочу купить: ${ru}.` },
        { zh: `这个${w}多少钱？`, ru: `Сколько стоит это: ${ru}?` },
        { zh: `我在超市买了${w}。`, ru: `Я купил(а) ${ru} в супермаркете.` },
      ]
    case 'образование':
      return [
        { zh: `我每天学习中文，也会复习${w}。`, ru: `Я каждый день учу китайский и повторяю ${ru}.` },
        { zh: `这个${w}不太难。`, ru: `Это ${ru} не очень сложно.` },
        { zh: `老师让我们练习${w}。`, ru: `Учитель попросил нас потренировать ${ru}.` },
      ]
    case 'работа':
      return [
        { zh: `我在公司工作，${w}对我很重要。`, ru: `Я работаю в компании, и ${ru} для меня важно.` },
        { zh: `我${w}的时候很认真。`, ru: `Когда я ${ru}, я очень внимателен(на).` },
        { zh: `${w}以后，我就回家。`, ru: `После ${ru} я пойду домой.` },
      ]
    case 'природа':
      return [
        { zh: `今天${w}很好，我们出去走走吧。`, ru: `Сегодня ${ru} хорошая, давай выйдем погулять.` },
        { zh: `我喜欢${w}。`, ru: `Мне нравится: ${ru}.` },
        { zh: `${w}的时候别忘了带伞。`, ru: `Когда ${ru}, не забудь взять зонт.` },
      ]
    case 'эмоции':
      return [
        { zh: `听到这个消息，我很${w}。`, ru: `Услышав эту новость, я очень ${ru}.` },
        { zh: `我今天有点儿${w}。`, ru: `Сегодня я немного ${ru}.` },
        { zh: `他的话让我很${w}。`, ru: `Его слова сделали меня очень ${ru}.` },
      ]
    case 'действия':
      return [
        { zh: `我想${w}一下，你等我。`, ru: `Я хочу ${ru} немного, подожди меня.` },
        { zh: `我们${w}完就走。`, ru: `Мы закончим ${ru} и пойдём.` },
        { zh: `现在不方便${w}。`, ru: `Сейчас неудобно ${ru}.` },
      ]
    case 'союзы':
      // Реальные союзные слова типа 因为/所以/如果/虽然/但是/或者/还是 и т.п.
      // уже покрыты `functionWordTemplates`. Если сюда попали «обычные» слова из-за
      // грубой разметки темы, даём нейтральные фразы с вставкой слова, чтобы не плодить дубликаты.
      return [
        { zh: `我觉得${w}很重要。`, ru: `Я считаю, что ${ru} очень важно.` },
        { zh: `我不太明白${w}。`, ru: `Я не очень понимаю: ${ru}.` },
        { zh: `我们谈谈${w}吧。`, ru: `Давай поговорим про: ${ru}.` },
      ]
    case 'бытовое':
    default:
      return [
        { zh: `这是${w}。`, ru: `Это: ${ru}.` },
        { zh: `我喜欢这个${w}。`, ru: `Мне нравится этот/эта: ${ru}.` },
        { zh: `我常常用${w}。`, ru: `Я часто использую: ${ru}.` },
      ]
  }
}

function sanitizeExample(ex) {
  // Иногда шаблон не подходит грамматически (особенно для местоимений/частиц).
  // В этих случаях пусть пример будет максимально простой и корректный.
  if (!ex.zh || ex.zh.length < 2) {
    return { zh: '我会说中文。', ru: 'Я умею говорить по-китайски.' }
  }
  return ex
}

function normalizePunct(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/，/g, '，')
    .replace(/。+$/g, '。')
    .trim()
}

function main() {
  const words = safeJson(WORDS_PATH)
  let filled = 0
  const usedZh = new Set()

  const next = words.map((w) => {
    // Перегенерируем всегда: улучшаем качество примеров
    // (если нужно сохранять старые — можно добавить флаг, но сейчас важнее консистентность)

    const variants = pickTemplateVariants(w).map(sanitizeExample)
    let picked = variants[0]
    for (const v of variants) {
      const key = normalizePunct(v.zh)
      if (!usedZh.has(key)) {
        picked = v
        usedZh.add(key)
        break
      }
    }

    let example_zh = picked.zh
    if (w?.hanzi && !String(example_zh).includes(String(w.hanzi))) {
      // Жёсткая гарантия: пример должен содержать само слово.
      // Если из-за разметки темы/шаблона это не так — откатываемся на безопасный вариант.
      example_zh = `这是${w.hanzi}。`
      usedZh.add(normalizePunct(example_zh))
    }
    const example_pinyin = zhPinyin(example_zh)
    const example_ru =
      w?.hanzi && !String(picked.zh).includes(String(w.hanzi)) ? `Это: ${w.translation || 'это'}.` : picked.ru

    filled++
    return { ...w, example_zh, example_pinyin, example_ru }
  })

  writeJson(WORDS_PATH, next)
  const emptyAfter = next.filter((w) => !w.example_zh || !w.example_pinyin || !w.example_ru).length

  console.log(
    JSON.stringify(
      {
        total: next.length,
        filled,
        empty_after: emptyAfter,
      },
      null,
      2,
    ),
  )
}

main()

