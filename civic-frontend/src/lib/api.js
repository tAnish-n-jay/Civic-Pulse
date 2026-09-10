import axios from 'axios'
import { supabase } from './supabase'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export const api = axios.create({
  baseURL: BACKEND_URL,
})

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})