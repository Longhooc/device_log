import React, { useState, useEffect } from 'react';
import { fetchAllDataAPI, deleteData, fetchDataByNameAPI, submitAPI } from '../api/api';
import './DeviceManagement.scss';

function DeviceManagement() {
    // State for device management (View_page functionality)
    const [allDevices, setAllDevices] = useState([]);
    const [showAllDevices, setShowAllDevices] = useState(true);

    // State for device input form (Form functionality)
    const [seri, setSeri] = useState("");
    const [nameDevice, setNameDevice] = useState("");
    const [note, setNote] = useState("");
    const [result, setResult] = useState([]);
    const [imagePath, setImagePath] = useState("");
    const [authCode, setAuthCode] = useState("");
    const [message, setMessage] = useState({ text: "", type: "" });

    // Active tab state
    const [activeTab, setActiveTab] = useState('management'); // 'management' or 'input'

    const showTemporaryMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    };

    // Device Management Functions (from View_page)
    useEffect(() => {
        if (showAllDevices) {
            const fetchDataAndSort = async () => {
                try {
                    const response = await fetchAllDataAPI();
                    if (response.statusText !== 'OK') {
                        throw new Error(`Mã lỗi: ${response.status}`);
                    }
                    const sortedData = response.data.sort((a, b) =>
                        new Date(b.created_at) - new Date(a.created_at)
                    );
                    setAllDevices(sortedData);
                } catch (error) {
                    console.error("Lỗi khi truy xuất dữ liệu:", error);
                    alert("Lỗi khi truy xuất dữ liệu. Vui lòng thử lại!");
                }
            };

            fetchDataAndSort();
        }
    }, [showAllDevices]);

    const fetchAllData = async () => {
        try {
            const response = await fetchAllDataAPI();
            if (!response.statusText === 'OK') {
                throw new Error('Mã lỗi: ' + response.status);
            }
            setAllDevices(response.data);
        }
        catch (error) {
            console.error("Lỗi khi truy xuất dữ liệu:", error);
            alert("Lỗi khi truy xuất dữ liệu.");
            setAllDevices([]);
        }
    };

    const sortByName = () => {
        const sortedData = [...allDevices].sort((a, b) =>
            a.name_device.localeCompare(b.name_device)
        );
        setAllDevices(sortedData);
    };

    const sortByOrder = () => {
        const sortedData = [...allDevices].sort((a, b) =>
            a.seri.localeCompare(b.seri)
        );
        setAllDevices(sortedData);
    };

    const sortByDate = () => {
        const sortedData = [...allDevices].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );
        setAllDevices(sortedData);
    };

    const deleteRow = async (id) => {
        const confirmationCode = prompt("Vui lòng nhập mã xác nhận để xóa:");

        if (confirmationCode !== null) {
            try {
                const response = await deleteData(id, confirmationCode);
                if (response.status === 200) {
                    const row = document.getElementById(`row-${id}`);
                    if (row) {
                        row.remove();
                    }

                    alert(` ${response.data.message}`);
                } else {
                    alert("Mã xác nhận không đúng.");
                }
            } catch (error) {
                console.error("Lỗi khi xóa:", error);
            }
        } else {
            alert("Hủy thao tác xóa.");
        }
    };

    // Device Input Functions (from Form)
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

    const renderNoteWithLinks = (noteText) => {
        if (!noteText) return '';
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const textSegments = noteText.split(urlPattern);
        return textSegments.map((segment, index) => {
            const isUrl = segment.startsWith('http://') || segment.startsWith('https://');
            if (isUrl) {
                return (
                    <a key={`link-${index}`} href={segment} target="_blank" rel="noopener noreferrer">
                        {segment}
                    </a>
                );
            }
            return <React.Fragment key={`text-${index}`}>{segment}</React.Fragment>;
        });
    };

    return (
        <div className="device-management">
            <div className="page-header">
                <h1>🔧 Quản lý thiết bị</h1>
                <p>Gộp chức năng quản lý và khai báo thiết bị trong một trang</p>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button 
                    className={`tab-button ${activeTab === 'management' ? 'active' : ''}`}
                    onClick={() => setActiveTab('management')}
                >
                    📊 Quản lý thiết bị
                </button>
                <button 
                    className={`tab-button ${activeTab === 'input' ? 'active' : ''}`}
                    onClick={() => setActiveTab('input')}
                >
                    📝 Khai báo thiết bị
                </button>
            </div>

            {/* Device Management Tab */}
            {activeTab === 'management' && (
                <div className="management-section">
                    <h2>Quản trị tất cả thiết bị</h2>

                    <div className="button-group">
                        <button onClick={fetchAllData}>Truy xuất toàn bộ dữ liệu</button>
                        <button onClick={sortByName}>Sắp xếp theo tên thiết bị</button>
                        <button onClick={sortByOrder}>Sắp xếp theo Seri</button>
                        <button onClick={sortByDate}>Sắp xếp theo ngày giờ</button>
                    </div>

                    <table border="1" id="dataTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tên thiết bị</th>
                                <th>Seri</th>
                                <th>Hành động</th>
                                <th>Mô tả</th>
                                <th>Ngày giờ</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allDevices.length > 0 ? allDevices.map(item => (
                                <tr key={item.id} id={`row-${item.id}`}>
                                    <td>{item.id}</td>
                                    <td>{item.name_device}</td>
                                    <td>{item.seri}</td>
                                    <td>{item.action}</td>
                                    <td>{renderNoteWithLinks(item.note)}</td>
                                    <td>{new Date(item.created_at).toLocaleString()}</td>
                                    <td><button onClick={() => deleteRow(item.id)}>Xóa</button></td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7">Không có dữ liệu</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Device Input Tab */}
            {activeTab === 'input' && (
                <div className="input-section">
                    <h2>Nhập thông tin theo Sê ri (S/N)</h2>
                    <form>
                        <div className="form-group">
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

                            <label htmlFor="name_device">Tên thiết bị:</label>
                            <input
                                type="text"
                                id="name_device"
                                value={nameDevice}
                                onChange={(e) => setNameDevice(e.target.value)}
                                required
                            />

                            <label htmlFor="note">Mô tả:</label>
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
            )}
        </div>
    );
}

export default DeviceManagement;
