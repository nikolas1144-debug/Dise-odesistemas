import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductForm from '../components/ProductForm';
import { useAuth } from '../hooks/useAuth';

function ProductEntryPage() {
  const { request, hasRole } = useAuth();
  const [dispatchGuides, setDispatchGuides] = useState([]);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [guidesError, setGuidesError] = useState('');
  const [productModels, setProductModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  const canManage = hasRole('ADMIN', 'MANAGER');

  const loadDispatchGuides = useCallback(async () => {
    setLoadingGuides(true);
    setGuidesError('');
    try {
      const guides = await request('/dispatch-guides');
      setDispatchGuides(guides);
    } catch (error) {
      setGuidesError(error.message || 'No se pudieron obtener las guías de despacho.');
      setDispatchGuides([]);
    } finally {
      setLoadingGuides(false);
    }
  }, [request]);

  const loadProductModels = useCallback(async () => {
    setLoadingModels(true);
    setModelsError('');
    try {
      const models = await request('/product-models');
      setProductModels(models);
    } catch (error) {
      setModelsError(error.message || 'No se pudieron obtener los modelos de producto.');
      setProductModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [request]);

  useEffect(() => {
    if (canManage) {
      loadDispatchGuides();
      loadProductModels();
    }
  }, [loadDispatchGuides, loadProductModels, canManage]);

  const handleCreateProduct = useCallback(
    async (payload) => {
      setCreatingProduct(true);
      try {
        if (payload.isSerialized === false) {
          const bulkPayload = {
            productModelId: payload.productModelId,
            type: payload.type,
            dispatchGuideId: payload.dispatchGuideId,
            quantity: payload.quantity,
            isSerialized: false,
          };

          if (payload.type === 'PURCHASED' && payload.inventoryNumber) {
            bulkPayload.inventoryNumber = payload.inventoryNumber;
          }

          if (payload.type === 'RENTAL' && payload.rentalId) {
            bulkPayload.rentalId = payload.rentalId;
          }

          await request('/products', {
            method: 'POST',
            data: bulkPayload,
          });

          window.alert(
            payload.quantity === 1
              ? 'Se registró 1 unidad sin número de serie.'
              : `Se registraron ${payload.quantity} unidades sin número de serie.`
          );
          return;
        }

        const serialCount = payload.serialNumbers?.length || 0;

        if (!serialCount) {
          throw new Error('Debes ingresar al menos un número de serie.');
        }

        if (serialCount === 1) {
          const [serialNumber] = payload.serialNumbers;
          const singlePayload = {
            productModelId: payload.productModelId,
            type: payload.type,
            serialNumber,
            dispatchGuideId: payload.dispatchGuideId,
            isSerialized: true,
          };

          if (payload.type === 'PURCHASED' && payload.inventoryNumber) {
            singlePayload.inventoryNumber = payload.inventoryNumber;
          }

          if (payload.type === 'RENTAL' && payload.rentalId) {
            singlePayload.rentalId = payload.rentalId;
          }

          await request('/products', {
            method: 'POST',
            data: singlePayload,
          });
        } else {
          const bulkPayload = {
            productModelId: payload.productModelId,
            type: payload.type,
            serialNumbers: payload.serialNumbers,
            dispatchGuideId: payload.dispatchGuideId,
          };

          if (payload.type === 'RENTAL' && payload.rentalId) {
            bulkPayload.rentalId = payload.rentalId;
          }

          await request('/products/bulk', {
            method: 'POST',
            data: bulkPayload,
          });
        }

        window.alert(
          serialCount === 1
            ? 'Producto registrado correctamente.'
            : `Se registraron ${serialCount} productos correctamente.`
        );
      } catch (error) {
        throw error;
      } finally {
        setCreatingProduct(false);
      }
    },
    [request]
  );

  if (!canManage) {
    return (
      <section className="dashboard-section">
        <div className="card">
          <h2>Ingresar producto</h2>
          <p className="muted">
            Solo los administradores o encargados pueden registrar nuevos productos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2>Ingresar producto</h2>
          <p className="muted">
            Registra equipos nuevos y asócialos a la guía de despacho correspondiente.
          </p>
        </div>
        <div className="section-actions">
          <button
            type="button"
            className="secondary"
            onClick={loadDispatchGuides}
            disabled={loadingGuides}
          >
            {loadingGuides ? 'Actualizando...' : 'Actualizar guías'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={loadProductModels}
            disabled={loadingModels}
          >
            {loadingModels ? 'Actualizando...' : 'Actualizar modelos'}
          </button>
        </div>
      </div>

      {guidesError && (
        <div className="card">
          <strong>Error:</strong> {guidesError}
        </div>
      )}

      {modelsError && (
        <div className="card">
          <strong>Error:</strong> {modelsError}
        </div>
      )}

      {productModels.length === 0 && !loadingModels && (
        <div className="card">
          <strong>Atención:</strong> Aún no hay modelos registrados. Visita el{' '}
          <Link to="/productos/catalogo">catálogo de productos</Link> para crear uno antes de continuar.
        </div>
      )}

      <ProductForm
        onSubmit={handleCreateProduct}
        dispatchGuides={dispatchGuides}
        isSubmitting={creatingProduct}
        productModels={productModels}
      />
    </section>
  );
}

export default ProductEntryPage;
