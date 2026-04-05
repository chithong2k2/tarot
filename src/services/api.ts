export const apiService = {
  syncAllData: async (payload: any) => {
    try {
      const apiUrl = import.meta.env.VITE_GAS_API_URL;
      if (!apiUrl) {
        return { status: 'error', message: 'VITE_GAS_API_URL is not defined' };
      }
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      return { status: 'ok', data };
    } catch (error: any) {
      return { status: 'error', message: error.message };
    }
  }
};
