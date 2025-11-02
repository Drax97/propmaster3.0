const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function setupSupabaseBuckets() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Buckets to create
  const bucketsToCreate = [
    'property-images',
    'property-documents'
  ]

  for (const bucketName of bucketsToCreate) {
    console.log(`Checking bucket: ${bucketName}`)
    
    try {
      // Attempt to create the bucket (will fail if already exists)
      const { error: createError } = await supabase.storage.createBucket(
        bucketName, 
        { 
          public: true 
        }
      )

      if (createError) {
        if (createError.code === 'BUCKET_ALREADY_EXISTS') {
          console.log(`Bucket ${bucketName} already exists.`)
        } else {
          console.error(`Error creating bucket ${bucketName}:`, createError)
        }
      } else {
        console.log(`Bucket ${bucketName} created successfully.`)
      }

    } catch (error) {
      console.error(`Unexpected error with bucket ${bucketName}:`, error)
    }
  }

  console.log('Supabase storage setup completed.')
}

setupSupabaseBuckets().catch(console.error)
