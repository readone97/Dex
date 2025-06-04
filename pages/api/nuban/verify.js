// pages/api/nuban/verify.js

import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { account_number } = req.query
  const token = process.env.NUBAN_API_TOKEN

  if (!token) {
    return res.status(500).json({ message: 'Missing NUBAN API token in environment.' })
  }

  if (!account_number || String(account_number).length !== 10) {
    return res.status(400).json({ message: 'Invalid or missing account_number parameter.' })
  }

  try {
    // Step 1: Fetch available bank codes
    const codesRes = await fetch('https://nubapi.com/api/bank-json', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!codesRes.ok) throw new Error('Failed to fetch bank codes')
    const codesData = await codesRes.json()

    // Use first bank code as default (adjust logic as needed)
    const bankCode = codesData[0]?.code
    if (!bankCode) throw new Error('No bank code found')

    // Step 2: Verify account details
    const verifyRes = await fetch(
      `https://nubapi.com/api/verify?account_number=${account_number}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => null)
      return res.status(verifyRes.status).json({ message: err?.message || 'Verification failed' })
    }

    const verifyData = await verifyRes.json()
    return res.status(200).json(verifyData)
  } catch (error) {
    console.error('NUBAN proxy error:', error)
    return res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
