const fs = require('fs/promises')
const path = require('path')

const FILE_PATH =
  process.env.NODE_ENV === 'production'
    ? '/tmp/data.json'
    : path.join(__dirname, '..', 'data.json')

async function readData() {
  try {
    const file = await fs.readFile(FILE_PATH, 'utf8')
    return JSON.parse(file || '[]')
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(FILE_PATH, '[]', 'utf8')
      return []
    }
    throw error
  }
}

async function writeData(data) {
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), 'utf8')
}

const SEARCHABLE_FIELDS = ['brand']

async function getAll(query = {}) {
  const data = await readData()

  const {
    key = '',
    field = '',
    page = 1,
    limit = 10
  } = query

  const pageNumber = Math.max(1, Number(page) || 1)
  const limitNumber = Math.max(1, Number(limit) || 10)

  let filteredData = data

  if (key) {
    const search = String(key).trim().toLowerCase()

    if (field && SEARCHABLE_FIELDS.includes(field)) {
      filteredData = data.filter(item =>
        String(item[field] || '').toLowerCase().includes(search)
      )
    } else {
      filteredData = data.filter(item =>
        SEARCHABLE_FIELDS.some(field =>
          String(item[field] || '').toLowerCase().includes(search)
        )
      )
    }
  }

  const total = filteredData.length
  const totalPage = Math.ceil(total / limitNumber)
  const currPage = pageNumber
  const startIndex = (currPage - 1) * limitNumber
  const endIndex = startIndex + limitNumber
  const paginatedData = filteredData.slice(startIndex, endIndex)

  return {
    data: paginatedData,
    total,
    currPage,
    totalPage,
    limit
  }
}

async function getById(id) {
  const data = await readData()
  return data.find(item => String(item.id) === String(id))
}

async function create(payload) {
  const data = await readData()

  const newItem = {
    id: Date.now(),
    ...payload
  }

  data.push(newItem)
  await writeData(data)

  return newItem
}

async function update(id, payload) {
  const data = await readData()
  const index = data.findIndex(item => String(item.id) === String(id))

  if (index === -1) {
    return null
  }

  data[index] = {
    ...data[index],
    ...payload
  }

  await writeData(data)
  return data[index]
}

async function remove(id) {
  const data = await readData()
  const filtered = data.filter(item => String(item.id) !== String(id))

  if (filtered.length === data.length) {
    return false
  }

  await writeData(filtered)
  return true
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
}