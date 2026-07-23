import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "react-email"

export function ReminderEmail({
  title,
  body,
  actionUrl,
  actionLabel,
}: {
  title: string
  body: string
  actionUrl: string
  actionLabel: string
}) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f4f7" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "32px",
            borderRadius: "12px",
            maxWidth: "480px",
            margin: "40px auto",
          }}
        >
          <Heading style={{ fontSize: "20px", color: "#111827" }}>{title}</Heading>
          <Text style={{ fontSize: "14px", color: "#4b5563" }}>{body}</Text>
          <Button
            href={actionUrl}
            style={{
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            {actionLabel}
          </Button>
          <Text style={{ fontSize: "12px", color: "#9ca3af", marginTop: "24px" }}>
            StudyPlanix — Your AI-powered university companion.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
