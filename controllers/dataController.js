const dataService = require('../services/dataService')

async function getAllData(req, res) {
  try {
    const data = await dataService.getAll(req.query)
    res.json(data)
  } catch (error) {
    res.status(500).json({
      message: 'Failed to read data',
      error: error.message
    })
  }
}

async function getDataById(req, res) {
  try {
    const item = await dataService.getById(req.params.id)

    if (!item) {
      return res.status(404).json({ message: 'Item not found' })
    }

    res.json(item)
  } catch (error) {
    res.status(500).json({
      message: 'Failed to read item',
      error: error.message
    })
  }
}

async function createData(req, res) {
  try {
    const newItem = await dataService.create(req.body)
    res.status(201).json(newItem)
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create data',
      error: error.message
    })
  }
}

async function updateData(req, res) {
  try {
    const updatedItem = await dataService.update(req.params.id, req.body)

    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' })
    }

    res.json(updatedItem)
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update data',
      error: error.message
    })
  }
}

async function deleteData(req, res) {
  try {
    const deleted = await dataService.remove(req.params.id)

    if (!deleted) {
      return res.status(404).json({ message: 'Item not found' })
    }

    res.json({ message: 'Deleted successfully' })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete data',
      error: error.message
    })
  }
}

module.exports = {
  getAllData,
  getDataById,
  createData,
  updateData,
  deleteData
}