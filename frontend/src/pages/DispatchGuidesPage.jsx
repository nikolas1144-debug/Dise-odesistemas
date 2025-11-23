import { useCallback, useEffect, useMemo, useState } from 'react';
import DispatchGuideManager from '../components/DispatchGuideManager';
import { getApiUrl } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { filterDispatchGuides, normalizeSearchTerm } from '../utils/search';

function DispatchGuidesPage() {
  const { request, token, hasRole } = useAuth();
  const [guides, setGuides] = useState([]);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [uploadingGuide, setUploadingGuide] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const canManage = hasRole('ADMIN', 'MANAGER');

  const loadGuides = useCallback(async () => {
    setLoadingGuides(true);
    setError('');
    try {
      const data = await request('/dispatch-guides');
      setGuides(data);
    } catch (err) {
      setError(err.message || 'No se pudieron obtener las guías de despacho.');
      setGuides([]);
    } finally {
      setLoadingGuides(false);
    }
  }, [request]);

  useEffect(() => {
    if (canManage) {
      loadGuides();
    }
  }, [loadGuides, canManage]);

  const handleUploadGuide = useCallback(
    async (formData) => {
      setUploadingGuide(true);
      setError('');
      try {
        await request('/dispatch-guides', {
          method: 'POST',
          formData,
        });
        await loadGuides();
        window.alert('Guía de despacho ingresada correctamente.');
      } finally {
        setUploadingGuide(false);
      }
    },
    [request, loadGuides]
  );

  const handleDownloadGuide = useCallback(
    async (guide) => {
      try {
        const response = await fetch(`${getApiUrl()}/dispatch-guides/${guide._id}/download`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('No se pudo descargar la guía de despacho.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = guide.fileName || `${guide.guideNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (downloadError) {
        alert(downloadError.message || 'No se pudo descargar la guía de despacho.');
      }
    },
    [token]
  );

  const handleDeleteGuide = useCallback(
    async (guide) => {
      const confirmed = window.confirm(
        `¿Deseas eliminar la guía ${guide.guideNumber}? Esta acción no se puede deshacer.`
      );
      if (!confirmed) {
        return;
      }
      try {
        await request(`/dispatch-guides/${guide._id}`, { method: 'DELETE' });
        await loadGuides();
      } catch (deleteError) {
        alert(deleteError.message || 'No se pudo eliminar la guía de despacho.');
      }
    },
    [request, loadGuides]
  );

  const normalizedSearch = useMemo(() => normalizeSearchTerm(searchTerm), [searchTerm]);

  const filteredGuides = useMemo(
    () => filterDispatchGuides(guides, searchTerm),
    [guides, searchTerm]
  );

  if (!canManage) {
    return (
      <section className="dashboard-section">
        <div className="card">
          <h2>Guías de despacho</h2>
          <p className="muted">
            No tienes permisos para gestionar guías de despacho.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2>Guías de despacho</h2>
          <p className="muted">Administra los respaldos de ingreso de inventario.</p>
        </div>
        <div className="section-actions">
          <label className="inline-filter">
            Buscar
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="N° de guía, proveedor, fecha..."
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={loadGuides}
            disabled={loadingGuides}
          >
            {loadingGuides ? 'Actualizando...' : 'Actualizar listado'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card">
          <strong>Error:</strong> {error}
        </div>
      )}

      <DispatchGuideManager
        guides={filteredGuides}
        onUpload={handleUploadGuide}
        onRefresh={loadGuides}
        onDownload={handleDownloadGuide}
        onDelete={handleDeleteGuide}
        isUploading={uploadingGuide}
        isFiltered={Boolean(normalizedSearch)}
      />
    </section>
  );
}

export default DispatchGuidesPage;
