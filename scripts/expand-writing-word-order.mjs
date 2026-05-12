import fs from 'node:fs'
import path from 'node:path'

const IN_PATH = path.resolve('src', 'data', 'writing.json')

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8')
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function mk(chunks, ru, end = '。') {
  return {
    words: chunks,
    answer: `${chunks.join('')}${end}`,
    translation: ru,
  }
}

function main() {
  const items = readJson(IN_PATH)
  const wordOrder = items.filter((x) => x.type === 'word_order')
  const others = items.filter((x) => x.type !== 'word_order')

  const targetWordOrder = 300
  if (wordOrder.length >= targetWordOrder) {
    console.log(`Уже достаточно word_order: ${wordOrder.length}`)
    return
  }

  const bank = [
    // Лёгкие
    mk(['我', '今天', '很', '忙'], 'Я сегодня очень занят(а).'),
    mk(['我们', '明天', '一起', '去', '公园'], 'Завтра мы вместе пойдём в парк.'),
    mk(['她', '现在', '在', '学习', '中文'], 'Она сейчас учит китайский.'),
    mk(['我', '不', '想', '出去'], 'Я не хочу выходить.'),
    mk(['你', '有没有', '时间'], 'У тебя есть время?','？'),
    mk(['他', '已经', '吃饱', '了'], 'Он уже наелся.'),
    mk(['我', '想', '喝', '一杯', '茶'], 'Я хочу выпить чашку чая.'),
    mk(['我们', '先', '吃饭', '然后', '去', '看电影'], 'Мы сначала поедим, потом пойдём в кино.'),
    mk(['今天', '外面', '有点儿', '冷'], 'Сегодня на улице немного холодно.'),
    mk(['这家', '饭店', '很', '便宜'], 'Этот ресторан дешёвый.'),

    // Средние: союзы, наречия, порядок
    mk(['因为', '下雨', '了', '所以', '我', '没', '去'], 'Потому что пошёл дождь, поэтому я не пошёл(а).'),
    mk(['虽然', '很', '累', '但是', '我', '还是', '要', '学习'], 'Хотя я очень устал(а), я всё равно буду учиться.'),
    mk(['如果', '你', '有', '时间', '就', '给', '我', '打电话'], 'Если у тебя будет время — позвони мне.'),
    mk(['我', '一', '到', '家', '就', '开始', '做饭'], 'Как только я пришёл(пришла) домой, сразу начал(а) готовить.'),
    mk(['对', '我', '来说', '坐', '地铁', '比较', '方便'], 'Для меня ехать на метро довольно удобно.'),
    mk(['除了', '中文', '以外', '他', '还', '会', '说', '英语'], 'Кроме китайского он ещё говорит по-английски.'),
    mk(['他', '不但', '会', '唱歌', '而且', '会', '跳舞'], 'Он не только умеет петь, но и танцевать.'),
    mk(['只有', '努力', '学习', '才', '会', '进步'], 'Только усердно учась, можно прогрессировать.'),
    mk(['你', '想', '喝', '茶', '还是', '咖啡'], 'Ты хочешь чай или кофе?','？'),
    mk(['我们', '吃完', '饭', '再', '去', '买', '东西'], 'Мы поедим и потом пойдём за покупками.'),

    // Сложнее: 把/被/连…都/结果补语/趋向
    mk(['请', '把', '门', '关上'], 'Пожалуйста, закрой дверь.'),
    mk(['我', '把', '票', '放', '在', '包里', '了'], 'Я положил(а) билет в сумку.'),
    mk(['他', '把', '作业', '写完', '了', '才', '出去'], 'Он закончил домашку и только потом вышел.'),
    mk(['我的', '手机', '被', '人', '偷', '了'], 'Мой телефон украли.'),
    mk(['衣服', '被', '雨', '淋湿', '了'], 'Одежда промокла под дождём.'),
    mk(['他', '连', '自己', '的', '名字', '都', '写', '错', '了'], 'Он даже своё имя написал неправильно.'),
    mk(['我', '连', '一口', '水', '都', '没', '喝'], 'Я даже глотка воды не выпил(а).'),
    mk(['我们', '一下课', '就', '去', '食堂', '吃饭'], 'Как только урок закончился, мы пошли в столовую.'),
    mk(['她', '一边', '做饭', '一边', '打电话'], 'Она готовит и одновременно говорит по телефону.'),
    mk(['这个', '问题', '越来越', '难', '了'], 'Этот вопрос становится всё сложнее.'),

    // Длинные “экзаменные”
    mk(['因为', '路上', '太', '堵', '了', '所以', '我', '来', '得', '有点儿', '晚'], 'Потому что были пробки, я пришёл(пришла) немного поздно.'),
    mk(['虽然', '这件', '衣服', '有点儿', '贵', '但是', '质量', '很好'], 'Хотя одежда немного дорогая, качество очень хорошее.'),
    mk(['如果', '你', '不', '舒服', '就', '早点儿', '休息', '别', '熬夜'], 'Если тебе плохо, отдохни пораньше и не сиди допоздна.'),
    mk(['我', '把', '钥匙', '忘', '在', '办公室', '了', '所以', '晚上', '进不了', '家'], 'Я забыл(а) ключи в офисе, поэтому вечером не смог(ла) попасть домой.'),
    mk(['老师', '说', '只有', '好好', '复习', '才', '能', '考', '得', '好'], 'Учитель сказал: только хорошо повторив, можно сдать хорошо.'),
    mk(['我们', '先', '去', '银行', '办事', '然后', '再', '去', '超市', '买', '水果'], 'Сначала мы пойдём в банк, потом в супермаркет за фруктами.'),
    mk(['对', '学生', '来说', '考试', '前', '多', '复习', '一点儿', '很', '重要'], 'Для студентов важно больше повторять перед экзаменом.'),
    mk(['他', '不但', '没', '迟到', '而且', '还', '来', '得', '很', '早'], 'Он не только не опоздал, но даже пришёл очень рано.'),
    mk(['我', '一', '看见', '价格', '就', '不', '想', '买', '了'], 'Как только я увидел(а) цену, сразу расхотел(а) покупать.'),
    mk(['除了', '今天', '以外', '你', '明天', '或者', '后天', '来', '都', '可以'], 'Кроме сегодня, ты можешь прийти завтра или послезавтра.'),
  ]

  // Генерим много вариаций на основе шаблонов
  const subjects = ['我', '他', '她', '我们', '你']
  const places = ['在家', '在学校', '在公司', '在饭馆', '在图书馆']
  const verbs = [
    ['学习', '中文'],
    ['复习', '单词'],
    ['看', '电影'],
    ['买', '东西'],
    ['去', '银行', '办事'],
    ['坐', '地铁', '去', '上班'],
    ['做', '作业'],
    ['写', '邮件'],
    ['喝', '一杯', '茶'],
    ['听', '音乐'],
  ]
  const reasons = [
    ['因为', '下雨', '了'],
    ['因为', '太', '累', '了'],
    ['因为', '路上', '很', '堵'],
    ['因为', '没', '时间'],
    ['因为', '生病', '了'],
  ]
  const results = [
    ['所以', '没', '去'],
    ['所以', '来', '得', '晚'],
    ['所以', '很', '高兴'],
    ['所以', '想', '休息'],
    ['所以', '不', '想', '出去'],
  ]
  const linkers = [
    ['虽然', '很', '忙', '但是', '还是', '来', '了'],
    ['如果', '有', '时间', '就', '一起', '去'],
    ['一', '到', '家', '就', '睡觉'],
    ['先', '学习', '然后', '休息'],
    ['对', '我', '来说', '比较', '方便'],
    ['不但', '好吃', '而且', '便宜'],
  ]

  const generated = []
  const seen = new Set(wordOrder.map((x) => x.answer))

  // 1) Вариативные “потому что”
  for (const s of subjects) {
    for (const r of reasons) {
      for (const res of results) {
        const chunks = [s, ...r, ...res]
        const ans = `${chunks.join('')}。`
        if (seen.has(ans)) continue
        seen.add(ans)
        generated.push(mk(chunks, 'Причина и результат (тренировка).'))
      }
    }
  }

  // 2) Простые действия + место/время
  const times = ['今天', '明天', '周末', '晚上', '早上']
  for (const s of subjects) {
    for (const t of times) {
      for (const v of verbs) {
        const chunks = [s, t, ...v]
        const ans = `${chunks.join('')}。`
        if (seen.has(ans)) continue
        seen.add(ans)
        generated.push(mk(chunks, 'Практика порядка слов.'))
      }
    }
  }

  // 3) Связки
  for (const s of subjects) {
    for (const l of linkers) {
      const chunks = [s, ...l]
      const ans = `${chunks.join('')}。`
      if (seen.has(ans)) continue
      seen.add(ans)
      generated.push(mk(chunks, 'Практика грамматических конструкций.'))
    }
  }

  // 4) “в месте” фразы
  for (const s of subjects) {
    for (const p of places) {
      const chunks = [s, p, '学习', '中文']
      const ans = `${chunks.join('')}。`
      if (seen.has(ans)) continue
      seen.add(ans)
      generated.push(mk(chunks, 'Практика места действия.'))
    }
  }

  // Собираем итог: оставляем исходные word_order, добавляем bank+generated
  const allCandidates = [...bank, ...generated]

  const nextWordOrder = [...wordOrder]
  for (const c of allCandidates) {
    if (nextWordOrder.length >= targetWordOrder) break
    if (seen.has(c.answer) && nextWordOrder.some((x) => x.answer === c.answer)) continue
    nextWordOrder.push({
      id: -1,
      type: 'word_order',
      words: shuffle(c.words),
      answer: c.answer,
      translation: c.translation,
    })
  }

  if (nextWordOrder.length < targetWordOrder) {
    // Добиваем простыми, если вдруг не хватило
    let i = 0
    while (nextWordOrder.length < targetWordOrder) {
      const s = subjects[i % subjects.length]
      const chunks = [s, '今天', '在家', '复习', '单词']
      const ans = `${chunks.join('')}。`
      if (!nextWordOrder.some((x) => x.answer === ans)) {
        nextWordOrder.push({
          id: -1,
          type: 'word_order',
          words: shuffle(chunks),
          answer: ans,
          translation: 'Добивка: повторение слов дома.',
        })
      }
      i++
    }
  }

  // Переиндексация id, сохраняем порядок: сначала word_order, потом write_character
  const final = [...nextWordOrder, ...others].map((x, i) => ({ ...x, id: i + 1 }))
  writeJson(IN_PATH, final)

  const counts = final.reduce((m, x) => ((m[x.type] = (m[x.type] || 0) + 1), m), {})
  console.log(JSON.stringify({ total: final.length, counts }, null, 2))
}

main()

