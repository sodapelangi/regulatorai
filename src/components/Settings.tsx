import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Settings as SettingsIcon, Database, Upload, Key, Shield, Bell } from "lucide-react";
import { IngestionPage } from "./IngestionPage";

interface SettingsProps {
  onBack?: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-gray-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="text-lg text-muted-foreground">
              Configure regulatory monitoring system and document ingestion
            </p>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="ingestion" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ingestion" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Document Ingestion
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Settings
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingestion">
          <IngestionPage />
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Supabase Vector Database</h3>
                    <p className="text-sm text-muted-foreground">
                      Vector embeddings and document storage
                    </p>
                  </div>
                  <Badge variant="secondary">Connected</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Metadata Storage</h3>
                    <p className="text-sm text-muted-foreground">
                      Regulation metadata and relationships
                    </p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">OpenAI API</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      For text embeddings and AI analysis
                    </p>
                    <Badge variant="outline">Not Configured</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Supabase API</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Database connections and authentication
                    </p>
                    <Badge variant="secondary">Connected</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Document Access Control</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage user permissions for sensitive regulatory documents
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Data Encryption</h3>
                  <p className="text-sm text-muted-foreground">
                    End-to-end encryption for document storage and transmission
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">Regulation Updates</h3>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new regulations are published
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">System Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Important system notifications and maintenance updates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}