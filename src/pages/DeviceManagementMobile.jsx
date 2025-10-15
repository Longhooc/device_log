import React, { useState, useEffect } from 'react';
import './DeviceManagement.scss';
import { fetchAllDataAPI, fetchDataByNameAPI, submitAPI, deleteData } from '../api/api';

function DeviceManagementMobile() {
    const [activeTab, setActiveTab] = useState('management');
    const [allDevices, setAllDevices] = useState([]);
    const [seri, setSeri] = useState("");
    const [nameDevice, setNameDevice] = useState("");
    const [note, setNote] = useState("");
    const [authCode, setAuthCode] = useState("");
    const [result, setResult] = useState([]);
    const [message, setMessage] = useState({ text: "", type: "" });

    useEffect(() => {
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
                alert('Lỗi khi truy xuất dữ liệu.');
            }
        };
        fetchDataAndSort();
    }, []);

    const showTemporaryMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const handleFetchData = async () => {
        try {
            const response = await fetchDataByNameAPI(seri);
            const data = await response.data;
            data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setResult(data);
        } catch (error) {
            setResult([]);
            showTemporaryMessage('Không tìm thấy thiết bị', 'error');
        }
    };

    const handleSendData = async (action) => {
        if (!seri || !nameDevice) {
            alert('Vui lòng nhập đầy đủ thông tin.');
            return;
        }
        const data = { name_device: nameDevice, seri, action, note, authCode };
        try {
            const response = await submitAPI(data);
            if (response.status == 200) {
                showTemporaryMessage('Lưu thành công', 'success');
            } else if (response.status === 100) {
                showTemporaryMessage('Mã xác thực không đúng', 'error');
            }
        } catch (error) {
            showTemporaryMessage('Lỗi khi gửi dữ liệu', 'error');
        }
    };

    const deleteRow = async (id) => {
        const confirmationCode = prompt('Vui lòng nhập mã xác nhận để xóa:');
        if (confirmationCode === null) return;
        try {
            const response = await deleteData(id, confirmationCode);
            if (response.status === 200) {
                setAllDevices(prev => prev.filter(d => d.id !== id));
                alert(response.data.message);
            } else {
                alert('Mã xác nhận không đúng.');
            }
        } catch (error) {
            alert('Lỗi khi xóa.');
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
                <p>Phiên bản mobile</p>
            </div>

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

            {activeTab === 'management' && (
                <div className="management-section">
                    <div className="button-group">
                        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Lên đầu</button>
                    </div>
                    <div className="table-wrapper">
                        <table id="dataTable">
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
                                    <tr key={item.id}>
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
                </div>
            )}

            {activeTab === 'input' && (
                <div className="input-section">
                    <div className="form-group">
                        <div className="input-group">
                            <label htmlFor="seri">Seri:</label>
                            <input id="seri" value={seri} onChange={(e) => setSeri(e.target.value)} />
                            <button type="button" onClick={handleFetchData}>Tra cứu</button>
                        </div>

                        <label htmlFor="name_device">Tên thiết bị:</label>
                        <input id="name_device" value={nameDevice} onChange={(e) => setNameDevice(e.target.value)} />

                        <label htmlFor="note">Mô tả:</label>
                        <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />

                        <div className="code">
                            <label>
                                Mã xác thực:
                                <input value={authCode} onChange={(e) => setAuthCode(e.target.value)} />
                            </label>
                        </div>
                    </div>

                    <div className="button-group">
                        <button type="button" onClick={() => handleSendData('Khai sinh')}>Khai sinh</button>
                        <button type="button" onClick={() => handleSendData('Cập nhật')}>Cập nhật</button>
                        <button type="button" onClick={() => handleSendData('Sửa chữa')}>Sửa chữa</button>
                        <button type="button" onClick={() => handleSendData('Bảo trì')}>Bảo trì</button>
                        <button type="button" onClick={() => handleSendData('Khai tử')}>Khai tử</button>
                    </div>

                    {message.text && (
                        <div className={`message ${message.type}`}>{message.text}</div>
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
                                            <td>{renderNoteWithLinks(item.note)}</td>
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

export default DeviceManagementMobile;


