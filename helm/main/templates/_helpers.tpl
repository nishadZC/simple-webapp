{{/*
Chart name
*/}}
{{- define "simple-webapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}


{{/*
Full release name
*/}}
{{- define "simple-webapp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{ .Values.fullnameOverride }}
{{- else }}
{{ .Release.Name }}
{{- end }}
{{- end }}


{{/*
Chart labels
*/}}
{{- define "simple-webapp.chart" -}}
{{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}


{{/*
Common labels
*/}}
{{- define "simple-webapp.labels" -}}
helm.sh/chart: {{ include "simple-webapp.chart" . }}
app.kubernetes.io/name: {{ include "simple-webapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}


{{/*
Selector labels
*/}}
{{- define "simple-webapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "simple-webapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}