import axios from 'axios';

const PRIMARY_URL = import.meta.env.VITE_API_BASE_URL;
const FALLBACK_URL = 'http://localhost:5000';

const api = axios.create({
    baseURL: PRIMARY_URL
});

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If the error is network-related or a server error, and we haven't retried yet
        if (
            !originalRequest._retried &&
            (!error.response || error.response.status >= 500 || error.code === 'ERR_NETWORK')
        ) {
            originalRequest._retried = true;

            console.warn(`[API] Primary URL (${originalRequest.baseURL || api.defaults.baseURL}) failed. Switching to fallback: ${FALLBACK_URL}`);

            // Update the base URL for future requests
            api.defaults.baseURL = FALLBACK_URL;

            // Update the base URL for the current request
            originalRequest.baseURL = FALLBACK_URL;

            // Retry the request
            return api(originalRequest);
        }

        return Promise.reject(error);
    }
);

export default api;
