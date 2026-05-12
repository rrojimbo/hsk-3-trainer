import fs from 'node:fs'
import path from 'node:path'

const IN_PATH = path.resolve('src', 'data', 'reading.json')

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

function main() {
  const existing = readJson(IN_PATH)
  const targetTotal = 200
  if (existing.length >= targetTotal) {
    console.log(`Уже достаточно: ${existing.length}`)
    return
  }

  const out = [...existing]

  const matchBank = [
    { statement: '你忙不忙？', options: ['有点儿忙。', '在桌子上。', '去公园吧。', '谢谢你。'], answer: 0 },
    { statement: '你会游泳吗？', options: ['会一点儿。', '我在医院。', '因为下雨。', '明天见。'], answer: 0 },
    { statement: '现在几点？', options: ['八点半。', '在学校。', '很贵。', '我不去。'], answer: 0 },
    { statement: '你去哪儿？', options: ['我去银行办事。', '我叫小王。', '我很高。', '谢谢。'], answer: 0 },
    { statement: '你怎么了？', options: ['我有点儿不舒服。', '我坐地铁来。', '我最喜欢。', '在家。'], answer: 0 },
    { statement: '周末见面可以吗？', options: ['可以，星期天吧。', '我不舒服。', '因为堵车。', '在公园。'], answer: 0 },
    { statement: '你要不要喝点儿水？', options: ['不用了，谢谢。', '我不懂。', '我买了。', '在这里。'], answer: 0 },
    { statement: '我们先做什么？', options: ['先吃饭，然后去看电影。', '我叫小李。', '很远。', '不贵。'], answer: 0 },
    { statement: '你觉得这个地方怎么样？', options: ['对我来说太吵了。', '我住在这儿。', '我看见了。', '明天再说。'], answer: 0 },
    { statement: '今天你为什么迟到？', options: ['因为堵车了。', '我在学校。', '我买了。', '我最喜欢。'], answer: 0 },
  ]

  const insertBank = [
    { text: '今天下雨了，___我们不去公园。', options: ['所以', '但是', '或者', '最'], answer: 0 },
    { text: '___你有时间，就来我家吧。', options: ['如果', '最', '又', '被'], answer: 0 },
    { text: '虽然很累，___我还是继续学习。', options: ['但是', '所以', '或者', '再'], answer: 0 },
    { text: '我一到家___开始做饭。', options: ['就', '才', '被', '除了'], answer: 0 },
    { text: '这件衣服有点儿贵，___很好看。', options: ['但是', '所以', '最', '被'], answer: 0 },
    { text: '除了中文以外，他___会说英语。', options: ['还', '最', '再', '把'], answer: 0 },
    { text: '他不但会唱歌，___会跳舞。', options: ['而且', '所以', '或者', '如果'], answer: 0 },
    { text: '只有努力学习，___会进步。', options: ['才', '就', '又', '最'], answer: 0 },
    { text: '你想喝茶___咖啡？', options: ['还是', '所以', '但是', '再'], answer: 0 },
    { text: '我们吃完饭___去买东西。', options: ['再', '最', '被', '虽然'], answer: 0 },
  ]

  const rcBank = [
    {
      text: '李明每天早上七点起床，吃完早饭就去学校。他坐公交车去学校，大概二十分钟。放学以后他常常去图书馆学习。',
      q: '李明怎么去学校？',
      optsZh: ['坐公交车', '坐地铁', '走路', '坐出租车'],
      optsRu: ['на автобусе', 'на метро', 'пешком', 'на такси'],
      answer: 0,
      expl: 'В тексте: 他坐公交车去学校。',
    },
    {
      text: '今天我去商店买衣服。虽然有点儿贵，但是很好看。我买了一件外套，还买了一双鞋。',
      q: '我买了什么？',
      optsZh: ['外套和鞋', '水果和牛奶', '手机和电脑', '书和笔'],
      optsRu: ['куртку и обувь', 'фрукты и молоко', 'телефон и компьютер', 'книгу и ручку'],
      answer: 0,
      expl: 'В тексте: 买了一件外套…买了一双鞋。',
    },
    {
      text: '因为堵车了，所以他迟到了。老师说：下次早点儿出门，不要再迟到了。',
      q: '他为什么迟到了？',
      optsZh: ['因为堵车', '因为生病', '因为下雨', '因为没睡好'],
      optsRu: ['из-за пробок', 'из-за болезни', 'из-за дождя', 'плохо спал'],
      answer: 0,
      expl: 'В тексте: 因为堵车了，所以他迟到了。',
    },
    {
      text: '我们家离地铁站很近，走路五分钟就到。坐地铁去市中心很方便，但是早上人比较多。',
      q: '从家到地铁站走路要多久？',
      optsZh: ['五分钟', '十分钟', '二十分钟', '半个小时'],
      optsRu: ['5 минут', '10 минут', '20 минут', 'полчаса'],
      answer: 0,
      expl: 'В тексте: 走路五分钟就到。',
    },
    {
      text: '小张不舒服，去医院看医生。医生让他多休息，少熬夜，还要多喝水。',
      q: '医生让小张做什么？',
      optsZh: ['多休息多喝水', '多运动少吃', '早点儿上班', '每天看电影'],
      optsRu: ['больше отдыхать и пить воду', 'больше спорт и меньше есть', 'пораньше на работу', 'каждый день кино'],
      answer: 0,
      expl: 'В тексте: 多休息…多喝水。',
    },
    {
      text: '周末我打算先写作业，然后去公园散步。如果下雨，就在家看书。',
      q: '如果下雨，我会做什么？',
      optsZh: ['在家看书', '去公园散步', '去银行办事', '去看医生'],
      optsRu: ['читать дома', 'гулять в парке', 'идти в банк', 'идти к врачу'],
      answer: 0,
      expl: 'В тексте: 如果下雨，就在家看书。',
    },
    {
      text: '我最近越来越忙，常常加班，所以回家很晚。虽然很累，但是我还是每天复习中文。',
      q: '我为什么回家很晚？',
      optsZh: ['因为加班', '因为堵车', '因为下雨', '因为去超市'],
      optsRu: ['из-за переработок', 'из-за пробок', 'из-за дождя', 'из-за супермаркета'],
      answer: 0,
      expl: 'В тексте: 常常加班，所以回家很晚。',
    },
    {
      text: '这家饭店不但服务很好，而且菜也很新鲜。虽然地方不大，但是人很多。',
      q: '这家饭店怎么样？',
      optsZh: ['服务好，菜新鲜', '很贵不好吃', '很远不方便', '很安静没人'],
      optsRu: ['хороший сервис и свежая еда', 'дорого и невкусно', 'далеко и неудобно', 'тихо и никого'],
      answer: 0,
      expl: 'В тексте: 服务很好…菜也很新鲜。',
    },
    {
      text: '我把钥匙忘在办公室了，所以晚上进不了家。后来同事帮忙把钥匙送来，我才回家。',
      q: '我为什么进不了家？',
      optsZh: ['没带钥匙', '门坏了', '太晚了', '下雨了'],
      optsRu: ['не было ключей', 'дверь сломалась', 'было поздно', 'шёл дождь'],
      answer: 0,
      expl: 'В тексте: 把钥匙忘在办公室了。',
    },
    {
      text: '今天是我的生日。朋友给我买了蛋糕，我们一起吃饭、拍照，我很开心。',
      q: '为什么我很开心？',
      optsZh: ['因为过生日', '因为下雨', '因为加班', '因为生病'],
      optsRu: ['потому что день рождения', 'потому что дождь', 'потому что переработки', 'потому что заболел'],
      answer: 0,
      expl: 'В тексте: 今天是我的生日…我很开心。',
    },
  ]

  const need = targetTotal - out.length
  const each = Math.ceil(need / 3)

  for (let i = 0; i < each && out.length < targetTotal; i++) {
    const b = matchBank[out.length % matchBank.length]
    out.push({
      id: out.length + 1,
      type: 'match_response',
      statement: b.statement,
      options: b.options,
      answer: b.answer,
    })
  }
  for (let i = 0; i < each && out.length < targetTotal; i++) {
    const b = insertBank[out.length % insertBank.length]
    out.push({
      id: out.length + 1,
      type: 'insert_sentence',
      text_with_blank: b.text,
      options: b.options,
      answer: b.answer,
    })
  }
  for (let i = 0; i < each && out.length < targetTotal; i++) {
    const b = rcBank[out.length % rcBank.length]
    out.push({
      id: out.length + 1,
      type: 'reading_comprehension',
      text_zh: b.text,
      question_zh: b.q,
      options_zh: b.optsZh,
      options_ru: b.optsRu,
      answer: b.answer,
      explanation_ru: b.expl,
    })
  }

  while (out.length < targetTotal) {
    const b = matchBank[out.length % matchBank.length]
    out.push({
      id: out.length + 1,
      type: 'match_response',
      statement: b.statement,
      options: b.options,
      answer: b.answer,
    })
  }

  // Перемешаем добавленные задания, сохранив первые исходные как есть
  const head = out.slice(0, existing.length)
  const tail = shuffle(out.slice(existing.length))
  const final = [...head, ...tail].map((x, i) => ({ ...x, id: i + 1 }))

  writeJson(IN_PATH, final)
  const counts = final.reduce((m, x) => ((m[x.type] = (m[x.type] || 0) + 1), m), {})
  console.log(JSON.stringify({ total: final.length, counts }, null, 2))
}

main()

