<script setup lang="ts">
import { Download, FileText, Trash2, UploadCloud } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { store } from '../store'
import type { DocumentFile } from '../types'

withDefaults(defineProps<{
  title: string
  description: string
  allowDownload?: boolean
  allowDelete?: boolean
}>(), {
  allowDownload: true,
  allowDelete: false,
})

const documents = ref<DocumentFile[]>([])
const selectedFiles = ref<File[]>([])
const loading = ref(false)
const deletingId = ref('')
const message = ref('')
const error = ref('')

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  if (size >= 1024) return `${Math.round(size / 1024)} KB`
  return `${size} B`
}

async function refreshDocuments() {
  documents.value = await store.listDocuments()
}

function selectFiles(event: Event) {
  selectedFiles.value = Array.from((event.target as HTMLInputElement).files || [])
  message.value = ''
  error.value = ''
}

async function uploadSelected() {
  if (!selectedFiles.value.length) return
  loading.value = true
  message.value = ''
  error.value = ''
  try {
    for (const file of selectedFiles.value) await store.uploadDocument(file)
    selectedFiles.value = []
    await refreshDocuments()
    message.value = '资料已上传'
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '资料上传失败'
  } finally {
    loading.value = false
  }
}

async function download(document: DocumentFile) {
  error.value = ''
  try {
    await store.downloadDocument(document)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '文件下载失败'
  }
}

async function remove(document: DocumentFile) {
  if (!window.confirm(`确认删除“${document.originalFileName}”？`)) return
  deletingId.value = document.id
  message.value = ''
  error.value = ''
  try {
    await store.deleteDocument(document.id)
    await refreshDocuments()
    message.value = '资料已删除'
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '文件删除失败'
  } finally {
    deletingId.value = ''
  }
}

onMounted(async () => {
  try {
    await refreshDocuments()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '资料列表加载失败'
  }
})
</script>

<template>
  <section class="card">
    <div class="card-header">
      <div><h2>{{ title }}</h2><p>{{ description }}</p></div>
      <FileText />
    </div>

    <label class="document-upload">
      <input type="file" multiple @change="selectFiles" />
      <UploadCloud :size="24" />
      <strong>{{ selectedFiles.length ? `已选择 ${selectedFiles.length} 个文件` : '选择资料文件' }}</strong>
      <span>PDF、Word、JPG、PNG，单文件不超过 20MB</span>
    </label>
    <div class="actions section-gap">
      <button class="btn btn-primary" :disabled="!selectedFiles.length || loading" @click="uploadSelected">
        <UploadCloud :size="17" />{{ loading ? '上传中...' : '上传资料' }}
      </button>
      <span v-if="message" class="inline-success">{{ message }}</span>
      <span v-if="error" class="inline-error">{{ error }}</span>
    </div>

    <div class="document-list section-gap">
      <div v-if="!documents.length" class="muted">暂无已上传资料。</div>
      <article v-for="document in documents" :key="document.id" class="document-row">
        <div>
          <strong>{{ document.originalFileName }}</strong>
          <span>{{ formatSize(document.fileSize) }} · {{ document.status }} · {{ new Date(document.createdAt).toLocaleString('zh-CN') }}</span>
        </div>
        <div class="document-actions">
          <button v-if="allowDownload" class="btn btn-secondary" @click="download(document)">
            <Download :size="17" />下载
          </button>
          <button
            v-if="allowDelete"
            class="btn btn-danger"
            :disabled="deletingId === document.id"
            @click="remove(document)"
          >
            <Trash2 :size="17" />{{ deletingId === document.id ? '删除中...' : '删除' }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.document-upload {
  min-height: 132px; border: 2px dashed #aac8c4; border-radius: 14px;
  display: grid; place-content: center; justify-items: center; gap: 7px;
  color: var(--brand); background: #f5fbfa; cursor: pointer; text-align: center;
}
.document-upload input { display: none; }
.document-upload span { color: var(--muted); font-size: 12px; }
.document-list { display: grid; gap: 10px; }
.document-row {
  display: flex; justify-content: space-between; align-items: center; gap: 14px;
  padding: 13px 0; border-top: 1px solid var(--line);
}
.document-row strong, .document-row span { display: block; }
.document-row span { margin-top: 4px; color: var(--muted); font-size: 12px; }
.document-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.inline-success { color: #166534; font-size: 13px; font-weight: 750; }
.inline-error { color: #9f1239; font-size: 13px; font-weight: 750; }
@media (max-width: 760px) {
  .document-row { align-items: stretch; flex-direction: column; }
  .document-actions { justify-content: flex-start; }
}
</style>
