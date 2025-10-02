import React, { useState, useEffect } from 'react';
import { fetchAllDataAPI, deleteData } from '../api/api';
import './View_page.scss';

function ViewPage() {
    const [data, setData] = useState([]);

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
                setData(sortedData);
            } catch (error) {
                console.error("Lỗi khi truy xuất dữ liệu:", error);
                alert("Lỗi khi truy xuất dữ liệu. Vui lòng thử lại!");
            }
        };

        fetchDataAndSort();
    }, []);

    const fetchAllData = async () => {
        try {
            const response = await fetchAllDataAPI();
            if (!response.statusText === 'OK') {
                throw new Error('Mã lỗi: ' + response.status);
            }
            setData(response.data);
        }
        catch (error) {
            console.error("Lỗi khi truy xuất dữ liệu:", error);
            alert("Lỗi khi truy xuất dữ liệu.");
            setData([]);
        }
    };

    const sortByName = () => {
        const sortedData = [...data].sort((a, b) =>
            a.name_device.localeCompare(b.name_device)
        );
        setData(sortedData);
    };

    const sortByOrder = () => {
        const sortedData = [...data].sort((a, b) =>
            a.seri.localeCompare(b.seri)
        );
        setData(sortedData);
    };

    const sortByDate = () => {
        const sortedData = [...data].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );
        setData(sortedData);
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

    return (
        <div className="view-page">
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
                    {data.length > 0 ? data.map(item => (
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
    );
}

export default ViewPage;