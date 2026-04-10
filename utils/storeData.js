const fs = require('fs/promises')
const path = require('path')

const FILE_PATH = path.join(__dirname, 'data.json')

export async function readData() {
  try {
    const data = await fs.readFile(FILE_PATH, 'utf8')
    return JSON.parse(data || '[]')
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(FILE_PATH, '[]')
      return []
    }
    throw error
  }
}

export async function writeData(data) {
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), 'utf8')
}

// GET all data
app.get('/api/data', async (req, res) => {
  try {
    const data = await readData()
    res.json(data)
  } catch (error) {
    res.status(500).json({ message: 'Failed to read data', error: error.message })
  }
})

// GET data by id
app.get('/api/data/:id', async (req, res) => {
  try {
    const data = await readData()
    const item = data.find(x => String(x.id) === req.params.id)

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    res.json(item)
  } catch (error) {
    res.status(500).json({ message: 'Failed to read item', error: error.message })
  }
})

// POST new data
app.post('/api/data', async (req, res) => {
  try {
    const data = await readData()
    const newItem = {
      id: Date.now(),
      ...req.body
    }

    data.push(newItem)
    await writeData(data)

    res.status(201).json(newItem)
  } catch (error) {
    res.status(500).json({ message: 'Failed to write data', error: error.message })
  }
})

// PUT update data
app.put('/api/data/:id', async (req, res) => {
  try {
    const data = await readData()
    const index = data.findIndex(x => String(x.id) === req.params.id)

    if (index === -1) {
      return res.status(404).json({ message: 'Item not found' })
    }

    data[index] = {
      ...data[index],
      ...req.body
    }

    await writeData(data)
    res.json(data[index])
  } catch (error) {
    res.status(500).json({ message: 'Failed to update data', error: error.message })
  }
})

// DELETE data
app.delete('/api/data/:id', async (req, res) => {
  try {
    const data = await readData()
    const filtered = data.filter(x => String(x.id) !== req.params.id)

    if (filtered.length === data.length) {
      return res.status(404).json({ message: 'Item not found' })
    }

    await writeData(filtered)
    res.json({ message: 'Deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete data', error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})