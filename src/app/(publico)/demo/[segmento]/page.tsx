// Página pública: demo interativa por segmento (barbearia, salao, etc.).
// O parâmetro :segmento determina qual seed carregar de /modulos/<segmento>/demo/seed.
import { useParams } from 'react-router-dom'

const PreviewDemo = () => {
  const { segmento } = useParams<{ segmento: string }>()
  return <div>/demo/{segmento} — PreviewDemo</div>
}
export default PreviewDemo
