import axios from 'axios';

export const fetchAllDataAPI = async () => {
    const response = await axios.get("https://axithcl.sytes.net:7778/fetchAll");

    return response;
};

export const fetchDataByNameAPI = async (seri) => {
    const response = await axios.get("https://axithcl.sytes.net:7778/fetch",
        {
            params: { seri },
        }
    );

    return response;
};
export const submitAPI = async (data) => {

    const response = await axios.post("https://axithcl.sytes.net:7778/submit", data, {
        headers: { "Content-Disposition": "application/json" },
    });
    return response; // Trả về toàn bộ phản hồi để xử lý

};
export const deleteData = async (id, confirmationCode) => {
    try {
        const response = await axios.delete(`https://axithcl.sytes.net:7778/delete/${id}`, {
            headers: { "Content-Type": "application/json" },
            data: {
            code: confirmationCode
            },
        });
        return response;
    } catch (error) {
        console.error("Lỗi khi xóa dữ liệu:", error);
        return false;
    }
};