import React, { useState } from "react";
import "./Form.scss"; // SCSS file cho giao diện
import { fetchDataByNameAPI, submitAPI } from "../api/api";


function DeviceInputForm() {
    const [seri, setSeri] = useState("");
    const [nameDevice, setNameDevice] = useState("");
    const [note, setNote] = useState("");
    const [result, setResult] = useState([]);
    const [imagePath, setImagePath] = useState("");
    const [authCode, setAuthCode] = useState("");
    const [message, setMessage] = useState({ text: "", type: "" });
    const showTemporaryMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    };
    const handleFetchData = async () => {
        try {
            const response = await fetchDataByNameAPI(seri);
            if (!response.statusText)
                throw new Error(`Mã lỗi: ${response.status}`);

            const data = await response.data;
            data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setResult(data);

            const path = `img/${seri}.jpg`;
            setImagePath(path);
        } catch (error) {
            console.error("Lỗi khi truy xuất dữ liệu:", error);
            setResult([]);
            setImagePath("");
            if (error.response.status === 404) {
                showTemporaryMessage("Không tìm thấy thiết bị", "error");
            }
        }
    };

    const handleSendData = async (action) => {
        if (!seri || !nameDevice) {
            alert("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        const confirmMessage = `
      Bạn có chắc chắn muốn gửi thông tin sau?
      - Seri: ${seri}
      - Tên thiết bị: ${nameDevice}
      - Hành động: ${action}
      - Mô tả: ${note}
    `;

        if (!window.confirm(confirmMessage)) return;

        const data = { name_device: nameDevice, seri, action, note, authCode };

        try {
            const response = await submitAPI(data);

            if (response.status == 200) {
            showTemporaryMessage("Lưu thành công", "success");
            // alert("Thông tin đã được gửi thành công!");
            }
            else if (response.status === 100) {
                showTemporaryMessage("Mã xác thực không đúng", "error");
            }
        } 
        catch (error) {
            console.error("Lỗi khi gửi dữ liệu:", error.response.data.message);
            if (error.status === 401) {
                showTemporaryMessage("Mã xác thực không đúng", "error");
            } else
            showTemporaryMessage("Lỗi khi gửi dữ liệu", "error");
        }
    };

    return (
        <div className="device-input-form">


            <h2>Nhập thông tin theo Sê ri (S/N)</h2>
            <form>
                <div class="form-group">

                    <div className="input-group">
                        <label htmlFor="seri">Seri:</label>

                        <input
                            type="text"
                            id="seri"
                            value={seri}
                            onChange={(e) => setSeri(e.target.value)}
                            required
                        />

                        <button type="button" onClick={handleFetchData}>
                        Tra cứu
                        </button>
                    </div>


                    <label htmlFor="name_device">Tên thiết bị:  </label>
                    <input
                        type="text"
                        id="name_device"
                        value={nameDevice}
                        onChange={(e) => setNameDevice(e.target.value)}
                        required
                    />

                    <label htmlFor="note">Mô tả: </label>
                    <input
                        type="text"
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        required
                    />
                    <div className="code">
                    <label>
                        Mã xác thực:
                        <input
                            type="text"
                            value={authCode}
                            onChange={(e) => setAuthCode(e.target.value)}
                            required
                        />
                    </label>
                    </div>
                </div>
                <div className="button-group">
                    <button type="button" onClick={() => handleSendData("Khai sinh")}>Khai sinh</button>
                    <button type="button" onClick={() => handleSendData("Cập nhật")}>Cập nhật</button>
                    <button type="button" onClick={() => handleSendData("Sửa chữa")}>Sửa chữa</button>
                    <button type="button" onClick={() => handleSendData("Bảo trì")}>Bảo trì</button>
                    <button type="button" onClick={() => handleSendData("Khai tử")}>Khai tử</button>
                </div>
            </form>
            {message.text && (
                <div className={`message ${message.type}`}>{message.text}</div>
            )}
            {imagePath && (
                <div className="image-section">
                    <h3>Hình ảnh sản phẩm</h3>
                    <img src={imagePath} alt="Hình ảnh thiết bị" onError={() => setImagePath("")} />
                </div>
            )}

            {result.length > 0 && (
                <div className="result-section">
                    <h3>Thông tin thiết bị</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Tên thiết bị</th>
                                <th>Seri</th>
                                <th>Hành động</th>
                                <th>Mô tả</th>
                                <th>Ngày tạo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.name_device}</td>
                                    <td>{item.seri}</td>
                                    <td>{item.action}</td>
                                    <td>{item.note}</td>
                                    <td>{new Date(item.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default DeviceInputForm;
