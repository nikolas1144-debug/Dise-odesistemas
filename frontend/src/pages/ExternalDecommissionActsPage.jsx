import { useCallback, useEffect, useMemo, useState } from 'react';
import ExternalDecommissionActsManager from '../components/ExternalDecommissionActsManager';
import { getApiUrl } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { filterExternalDecommissionActs, normalizeSearchTerm } from '../utils/search';

function ExternalDecommissionActsPage() {
  const { request, token, hasRole } = useAuth();
  const [acts, setActs] = useState([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [uploadingAct, setUploadingAct] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const canManage = hasRole('ADMIN', 'MANAGER');

  const loadActs = useCallback(async () => {
    setLoadingActs(true);
    setError('');
    setFeedback('');
    setActionError('');
    try {
      const data = await request('/external-decommission-acts');
      setActs(data);
    } catch (err) {
      setError(err.message || 'No se pudieron obtener las actas de bajas externas.');
      setActs([]);
    } finally {
      setLoadingActs(false);
    }
  }, [request]);

  useEffect(() => {
    if (canManage) {
      loadActs();
    }
  }, [loadActs, canManage]);

  const handleUploadAct = useCallback(
    async (formData) => {
      setUploadingAct(true);
      setError('');
      setFeedback('');
      setActionError('');
      try {
        await request('/external-decommission-acts', {
          method: 'POST',
          formData,
        });
        await loadActs();
        setFeedback('Acta registrada correctamente.');
      } catch (uploadError) {
        setError(uploadError.message || 'No se pudo registrar el acta de baja externa.');
        throw uploadError;
      } finally {
        setUploadingAct(false);
      }
    },
    [request, loadActs]
  );

  const handleDownloadAct = useCallback(
    async (act) => {
      try {
        setActionError('');
        const response = await fetch(
          `${getApiUrl()}/external-decommission-acts/${act._id}/download`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('No se pudo descargar el acta de baja externa.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = act.fileName || `${act.productName}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (downloadError) {
        setActionError(downloadError.message || 'No se pudo descargar el acta de baja externa.');
      }
    },
    [token]
  );

  const normalizedSearch = useMemo(() => normalizeSearchTerm(searchTerm), [searchTerm]);

  const filteredActs = useMemo(
    () => filterExternalDecommissionActs(acts, searchTerm),
    [acts, searchTerm]
  );

  if (!canManage) {
    return (
      <section className="dashboard-section">
        <div className="card">
          <h2>Actas de bajas externas</h2>
          <p className="muted">No tienes permisos para gestionar actas de bajas externas.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2>Actas de bajas externas</h2>
          <p className="muted">
            Registra y consulta los respaldos de bajas de equipos realizadas fuera del inventario.
          </p>
        </div>
        <div className="section-actions">
          <label className="inline-filter">
            Buscar
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Producto, serie, unidad, encargado..."
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={loadActs}
            disabled={loadingActs}
          >
            {loadingActs ? 'Actualizando...' : 'Actualizar listado'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card">
          <strong>Error:</strong> {error}
        </div>
      )}

      {actionError && (
        <div className="card">
          <strong>Alerta:</strong> {actionError}
        </div>
      )}

      {feedback && (
        <div className="card">
          <strong>Listo:</strong> {feedback}
        </div>
      )}

      <ExternalDecommissionActsManager
        acts={filteredActs}
        onUpload={handleUploadAct}
        onRefresh={loadActs}
        onDownload={handleDownloadAct}
        isUploading={uploadingAct}
        isFiltered={Boolean(normalizedSearch)}
      />
    </section>
  );
}

export default ExternalDecommissionActsPage;
