import axios from "axios";

const api = axios.create({
    baseURL: "https://powerpluse.onrender.com/api",
});

export default api;