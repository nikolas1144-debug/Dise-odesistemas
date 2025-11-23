import { useCallback, useEffect, useMemo, useState } from 'react';
import ProductEditForm from '../components/ProductEditForm';
import ProductTable from '../components/ProductTable';
import { useAuth } from '../hooks/useAuth';
import { getProductStatusBadge, getProductStatusLabel } from '../utils/productStatus';
import { filterProductsBySearch, normalizeSearchTerm } from '../utils/search';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'AVAILABLE', label: 'Disponibles' },
  { value: 'ASSIGNED', label: 'Asignados' },
  { value: 'DECOMMISSIONED', label: 'Dados de baja' },
];

function formatType(type) {
  if (type === 'PURCHASED') {
    return 'Compra';
  }
  if (type === 'RENTAL') {
    return 'Arriendo';
  }
  return type;
}

function InventoryPage() {
  const { request, hasRole } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState(false);
  const [updatingProduct, setUpdatingProduct] = useState(false);
  const [dispatchGuides, setDispatchGuides] = useState([]);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [guidesError, setGuidesError] = useState('');
  const [productModels, setProductModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');

  const canManage = hasRole('ADMIN', 'MANAGER');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/products');
      setProducts(data);
    } catch (err) {
      setError(err.message || 'No se pudo obtener el inventario.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadDispatchGuides = useCallback(async () => {
    if (!canManage) {
      return;
    }

    setLoadingGuides(true);
    setGuidesError('');
    try {
      const guides = await request('/dispatch-guides');
      setDispatchGuides(guides);
    } catch (err) {
      setGuidesError(err.message || 'No se pudieron obtener las guías de despacho.');
      setDispatchGuides([]);
    } finally {
      setLoadingGuides(false);
    }
  }, [canManage, request]);

  const loadProductModels = useCallback(async () => {
    if (!canManage) {
      return;
    }

    setLoadingModels(true);
    setModelsError('');
    try {
      const models = await request('/product-models');
      setProductModels(models);
    } catch (err) {
      setModelsError(err.message || 'No se pudieron obtener los modelos de producto.');
      setProductModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [canManage, request]);

  useEffect(() => {
    if (canManage) {
      loadDispatchGuides();
      loadProductModels();
    }
  }, [canManage, loadDispatchGuides, loadProductModels]);

  const filteredProducts = useMemo(
    () => filterProductsBySearch(products, searchTerm, { status: statusFilter }),
    [products, searchTerm, statusFilter]
  );

  useEffect(() => {
    setSelectedProductId((current) => {
      if (!filteredProducts.length) {
        return null;
      }
      if (current && filteredProducts.some((item) => item._id === current)) {
        return current;
      }
      return filteredProducts[0]._id;
    });
  }, [filteredProducts]);

  const selectedProduct = useMemo(
    () => filteredProducts.find((product) => product._id === selectedProductId) || null,
    [filteredProducts, selectedProductId]
  );

  useEffect(() => {
    if (!selectedProduct) {
      setEditing(false);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProductId) {
      setEditing(false);
    }
  }, [selectedProductId]);

  const normalizedSearch = useMemo(() => normalizeSearchTerm(searchTerm), [searchTerm]);

  const selectedProductName = selectedProduct?.productModel?.name || selectedProduct?.name;
  const selectedProductPartNumber =
    selectedProduct?.productModel?.partNumber || selectedProduct?.partNumber;
  const selectedProductDescription =
    selectedProduct?.productModel?.description ?? selectedProduct?.description;
  const selectedProductSerial = selectedProduct?.isSerialized
    ? selectedProduct?.serialNumber || '—'
    : 'Sin serie';
  const selectedProductQuantity = selectedProduct?.isSerialized
    ? 1
    : (() => {
        const parsed = Number(selectedProduct?.quantity);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
      })();

  const handleFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleStartEdit = () => {
    if (!selectedProduct || !canManage) {
      return;
    }
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleUpdateProduct = useCallback(
    async (payload) => {
      if (!canManage || !selectedProductId) {
        return;
      }

      setUpdatingProduct(true);
      try {
        await request(`/products/${selectedProductId}`, {
          method: 'PUT',
          data: payload,
        });
        await loadProducts();
        setFeedback('Producto actualizado correctamente.');
        setEditing(false);
      } catch (err) {
        throw err;
      } finally {
        setUpdatingProduct(false);
      }
    },
    [canManage, selectedProductId, request, loadProducts]
  );

  const handleDeleteProduct = useCallback(async () => {
    if (!selectedProduct || !canManage) {
      return;
    }

    if (selectedProduct.status === 'ASSIGNED') {
      setActionError('Debes liberar la asignación antes de eliminar el producto.');
      return;
    }

    const confirmed = window.confirm(
      '¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.'
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      setActionError('');
      await request(`/products/${selectedProduct._id}`, { method: 'DELETE' });
      await loadProducts();
    } catch (err) {
      setActionError(err.message || 'No se pudo eliminar el producto.');
    } finally {
      setDeleting(false);
    }
  }, [selectedProduct, canManage, request, loadProducts]);

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2>Inventario</h2>
          <p className="muted">Consulta el detalle de los productos registrados en bodega.</p>
        </div>
        <div className="section-actions">
          <label className="inline-filter">
            Buscar
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Nombre, serie, estado..."
            />
          </label>
          <label className="inline-filter">
            Estado
            <select value={statusFilter} onChange={handleFilterChange}>
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary" onClick={loadProducts} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
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

      <div className="dashboard-grid">
        <ProductTable
          products={filteredProducts}
          onSelect={setSelectedProductId}
          selectedProductId={selectedProductId}
          isFiltered={Boolean(normalizedSearch)}
        />
        {editing && selectedProduct ? (
          <ProductEditForm
            product={selectedProduct}
            dispatchGuides={dispatchGuides}
            productModels={productModels}
            onSubmit={handleUpdateProduct}
            onCancel={handleCancelEdit}
            isSubmitting={updatingProduct}
            onReloadDispatchGuides={loadDispatchGuides}
            onReloadProductModels={loadProductModels}
            loadingDispatchGuides={loadingGuides}
            loadingProductModels={loadingModels}
            guidesError={guidesError}
            modelsError={modelsError}
          />
        ) : (
          <div className="card">
            <div className="card-header">
              <h3>Detalle del producto</h3>
              <p className="muted">
                {selectedProduct
                  ? `Registrado el ${new Date(selectedProduct.createdAt).toLocaleDateString('es-CL')}`
                  : 'Selecciona un producto para ver su detalle.'}
              </p>
            </div>

            {!selectedProduct && <p className="muted">No hay productos que coincidan con el filtro.</p>}

            {selectedProduct && (
              <>
                <div className="detail-grid">
                  <div>
                    <strong>Nombre:</strong> {selectedProductName}
                  </div>
                  <div>
                    <strong>Tipo:</strong> {formatType(selectedProduct.type)}
                  </div>
                  <div>
                    <strong>Cantidad registrada:</strong> {selectedProductQuantity}
                  </div>
                  <div>
                    <strong>N° serie:</strong> {selectedProductSerial}
                  </div>
                  <div>
                    <strong>N° parte:</strong> {selectedProductPartNumber}
                  </div>
                  {selectedProduct.type === 'PURCHASED' ? (
                    <div>
                      <strong>N° inventario:</strong> {selectedProduct.inventoryNumber || '—'}
                    </div>
                  ) : (
                    <div>
                      <strong>ID arriendo:</strong> {selectedProduct.rentalId}
                    </div>
                  )}
                  <div>
                    <strong>Guía:</strong> {selectedProduct.dispatchGuide?.guideNumber || '—'}
                  </div>
                  {selectedProductDescription && (
                    <div className="full-row">
                      <strong>Descripción:</strong> {selectedProductDescription}
                    </div>
                  )}
                  <div className="full-row">
                    <strong>Estado:</strong>{' '}
                    <span className={getProductStatusBadge(selectedProduct.status)}>
                      {getProductStatusLabel(selectedProduct.status)}
                    </span>
                  </div>
                </div>

                {selectedProduct.status === 'ASSIGNED' && selectedProduct.currentAssignment && (
                  <div className="assignment-box">
                    <p>
                      <strong>{selectedProduct.currentAssignment.assignedTo}</strong>
                    </p>
                    {selectedProduct.currentAssignment.assignedEmail && (
                      <p className="muted small-text">
                        {selectedProduct.currentAssignment.assignedEmail}
                      </p>
                    )}
                    <p className="muted">
                      Ubicación: {selectedProduct.currentAssignment.location} ·{' '}
                      {new Date(
                        selectedProduct.currentAssignment.assignmentDate
                      ).toLocaleString('es-CL')}
                    </p>
                  </div>
                )}

                {!selectedProduct.isSerialized && (
                  <p className="muted small-text">
                    Este registro se administra por cantidad y no admite asignaciones individuales.
                  </p>
                )}

                {selectedProduct.status === 'DECOMMISSIONED' && (
                  <div className="assignment-box">
                    <p>
                      <strong>Motivo de baja:</strong> {selectedProduct.decommissionReason}
                    </p>
                    <p className="muted">
                      Registrado el{' '}
                      {selectedProduct.decommissionedAt
                        ? new Date(selectedProduct.decommissionedAt).toLocaleString('es-CL')
                        : '—'}
                      {selectedProduct.decommissionedBy?.name
                        ? ` · Por ${selectedProduct.decommissionedBy.name}`
                        : ''}
                    </p>
                  </div>
                )}

                {canManage && (
                  <div className="section-actions">
                    <button type="button" className="secondary" onClick={handleStartEdit}>
                      Editar producto
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={handleDeleteProduct}
                      disabled={deleting || selectedProduct.status === 'ASSIGNED'}
                    >
                      {deleting ? 'Eliminando...' : 'Eliminar producto'}
                    </button>
                  </div>
                )}
                {canManage && selectedProduct.status === 'ASSIGNED' && (
                  <p className="muted small-text">
                    Debes liberar la asignación antes de eliminar el producto.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default InventoryPage;
