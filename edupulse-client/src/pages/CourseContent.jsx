import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';

const CourseContent = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);

    const [materials, setMaterials] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);

    const navigate = useNavigate();

    // ✅ Async logic inside useEffect
    useEffect(() => {
        const fetchMaterials = async () => {
            const res = await API.get(`/Courses/${id}/materials`);
            setMaterials(res.data);
        };

        fetchMaterials();
    }, [id]);

    const handleUpload = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        if (file) formData.append('file', file);

        try {
            await API.post(`/Courses/${id}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('Posted successfully!');
            setTitle('');
            setDescription('');
            setFile(null);

            // refresh materials
            const res = await API.get(`/Courses/${id}/materials`);
            setMaterials(res.data);
        } catch {
            alert('Upload failed');
        }
    };

    // ✅ Helper function for file previews
    const renderPreview = (material) => {
        if (!material.fileUrl) return null;

        const url = `https://localhost:7096${material.fileUrl}`;
        const extension = material.fileName.split('.').pop().toLowerCase();

        // Image preview
        if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
            return (
                <div style={{ marginTop: '10px' }}>
                    <img
                        src={url}
                        alt="preview"
                        style={{
                            maxWidth: '100%',
                            borderRadius: '5px',
                            border: '1px solid #ccc'
                        }}
                    />
                </div>
            );
        }

        // PDF preview
        if (extension === 'pdf') {
            return (
                <div style={{ marginTop: '10px' }}>
                    <iframe
                        src={url}
                        title="pdf-preview"
                        style={{ width: '100%', height: '400px', border: 'none', borderRadius: '5px' }}
                    />
                    <p style={{ fontSize: '0.8em' }}>
                        <a href={url} target="_blank" rel="noreferrer">
                            Open PDF in full screen ↗
                        </a>
                    </p>
                </div>
            );
        }

        // Other file types (PPTX, DOCX, etc.) as download
        return (
            <div style={{ marginTop: '10px', background: '#eee', padding: '10px', borderRadius: '5px' }}>
                📎{' '}
                <a href={url} target="_blank" rel="noreferrer" download>
                    Download: {material.fileName}
                </a>
                <p style={{ fontSize: '0.75em', color: '#666', marginTop: '5px' }}>
                    (Office files must be downloaded to view)
                </p>
            </div>
        );
    };

    if (!user) {
        return <div className="dashboard-container">Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <div className="header-strip">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-action"
                >
                    ← Back
                </button>
                <h2>Course Stream</h2>
            </div>

            {user.role === 'Teacher' && (
                <form
                    onSubmit={handleUpload}
                    className="user-info-card"
                    style={{ marginBottom: '30px' }}
                >
                    <h3>Post Announcement or Material</h3>

                    <input
                        className="form-input"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />

                    <textarea
                        className="form-input"
                        placeholder="Announcement Details"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <input
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        style={{ marginBottom: '10px' }}
                    />

                    <button type="submit" className="btn-approve">
                        Post to Stream
                    </button>
                </form>
            )}

            {/* ================= CLASS FEED ================= */}
            <div className="admin-section">
                <h3>Class Feed</h3>

                {materials.length === 0 ? (
                    <p>Nothing posted yet.</p>
                ) : (
                    materials.map((m) => (
                        <div
                            key={m.id}
                            className="user-info-card"
                            style={{
                                marginBottom: '15px',
                                borderLeft: '5px solid #007bff',
                                color: 'black'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <h4 style={{ margin: 0 }}>{m.title}</h4>
                                <small>{new Date(m.createdAt).toLocaleDateString()}</small>
                            </div>

                            <p>{m.description}</p>

                            {/* ✅ Render file preview */}
                            {renderPreview(m)}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CourseContent;
