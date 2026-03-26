const BASE_URL = 'http://localhost:5001/api';

export const api = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token: string) => localStorage.setItem('token', token),
  clearToken: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  setUser: (user: any) => localStorage.setItem('user', JSON.stringify(user)),
  getUser: () => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  
  getHeaders: () => {
    const token = api.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  post: async (endpoint: string, data: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: api.getHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'API Error');
    return json;
  },
  
  get: async (endpoint: string) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: api.getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'API Error');
    return json;
  },
  
  put: async (endpoint: string, data: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: api.getHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'API Error');
    return json;
  },
  
  delete: async (endpoint: string) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: api.getHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'API Error');
    return json;
  }
};
