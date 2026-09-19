"use client"
import React from 'react'
import { useParams } from 'next/navigation'

function page() {
    const params = useParams()
  return (
    <div>hello {params.id}</div>
  )
}

export default page