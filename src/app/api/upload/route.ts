import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')
  const candidateName = (formData.get('candidateName') as string) || 'Ukendt kandidat'
  const jobTitle = (formData.get('jobTitle') as string) || null
  const jobId = formData.get('jobId') ? Number(formData.get('jobId')) : null

  if (!file || !(file instanceof File)) {
    return Response.json({ error: 'Ingen fil modtaget' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const safeName = file.name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName = `${Date.now()}_${safeName}`
  const { error: uploadError } = await supabase.storage.from('cvs').upload(fileName, file)

  if (uploadError) {
    console.error('[upload] Supabase storage error:', uploadError)
    return Response.json(
      { error: uploadError.message, details: (uploadError as any).error },
      { status: 500 },
    )
  }

  const payload = { file_name: file.name, file_path: fileName, candidate_name: candidateName, job_id: jobId, job_title: jobTitle }
  console.log('[upload] inserting:', JSON.stringify(payload))

  const { data, error: dbError } = await supabase.from('cv_uploads').insert(payload).select()

  if (dbError) {
    console.error('[upload] db error code:', dbError.code)
    console.error('[upload] db error message:', dbError.message)
    console.error('[upload] db error details:', dbError.details)
    return Response.json({ fileName, dbError: dbError.message, dbCode: dbError.code })
  }

  console.log('[upload] inserted row:', JSON.stringify(data))
  return Response.json({ fileName })
}
