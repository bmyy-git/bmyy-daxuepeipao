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
  allowSchoolFilter?: boolean
}>(), {
  allowDownload: true,
  allowDelete: false,
  allowSchoolFilter: false,
})

const documents = ref<DocumentFile[]>([])
const selectedFiles = ref<File[]>([])
const schools = ref<string[]>([])
const selectedSchool = ref('')
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const deletingId = ref('')
const message = ref('')
const error = ref('')
const pageSize = 20

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  if (size >= 1024) return `${Math.round(size / 1024)} KB`
  return `${size} B`
}

async function refreshDocuments() {
  const result = await store.listDocuments({
    school: selectedSchool.value || undefined,
    take: pageSize,
  })
  documents.value = result.items
  schools.value = result.schools
  nextCursor.value = result.nextCursor
}

async function loadMoreDocuments() {
  if (!nextCursor.value) return
  loadingMore.value = true
  error.value = ''
  try {
    const result = await store.listDocuments({
      school: selectedSchool.value || undefined,
      cursor: nextCursor.value,
      take: pageSize,
    })
    documents.value = [...documents.value, ...result.items]
    schools.value = result.schools
    nextCursor.value = result.nextCursor
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '资料列表加载失败'
  } finally {
    loadingMore.value = false
  }
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

    <div v-if="allowSchoolFilter" class="document-toolbar">
      <label class="school-filter">
        <span>学校</span>
        <select v-model="selectedSchool" @change="refreshDocuments">
          <option value="">全部学校</option>
          <option v-for="school in schools" :key="school" :value="school">{{ school }}</option>
        </select>
      </label>
      <span class="muted">当前显示 {{ documents.length }} 条</span>
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
          <small v-if="document.student" class="document-owner">
            {{ document.student.school }} · {{ document.student.name }} · {{ document.student.major }}
          </small>
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
      <button v-if="nextCursor" class="btn btn-secondary load-more" :disabled="loadingMore" @click="loadMoreDocuments">
        {{ loadingMore ? '加载中...' : '加载更多' }}
      </button>
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
.document-toolbar {
  display: flex; align-items: end; justify-content: space-between; gap: 14px;
  margin-bottom: 16px;
}
.school-filter { display: grid; gap: 6px; color: var(--ink); font-weight: 800; }
.school-filter span { font-size: 12px; color: var(--muted); }
.school-filter select {
  min-width: 220px; min-height: 40px; padding: 0 12px;
  border: 1px solid var(--line); border-radius: 8px; color: var(--ink); background: white;
}
.document-list { display: grid; gap: 10px; }
.document-row {
  display: flex; justify-content: space-between; align-items: center; gap: 14px;
  padding: 13px 0; border-top: 1px solid var(--line);
}
.document-row strong, .document-row span, .document-owner { display: block; }
.document-owner { margin-top: 4px; color: var(--brand); font-size: 12px; font-weight: 750; }
.document-row span { margin-top: 4px; color: var(--muted); font-size: 12px; }
.document-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.load-more { justify-self: center; margin-top: 4px; }
.inline-success { color: #166534; font-size: 13px; font-weight: 750; }
.inline-error { color: #9f1239; font-size: 13px; font-weight: 750; }
@media (max-width: 760px) {
  .document-row { align-items: stretch; flex-direction: column; }
  .document-actions { justify-content: flex-start; }
  .document-toolbar { align-items: stretch; flex-direction: column; }
  .school-filter select { min-width: 0; width: 100%; }
}
</style>
