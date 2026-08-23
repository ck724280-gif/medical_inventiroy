import { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, ArrowLeft, Users, Activity, Settings } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Branch Details | Super Admin | MedCare ERP',
  description: 'View branch information',
};

export default function SuperAdminBranchDetailPage({ params }: { params: { id: string } }) {
  // In a real app, fetch branch data by params.id (UUID)
  const branchId = params.id;
  
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/branches">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <PageHeader 
          title="Branch Details" 
          description={`Managing branch: ${branchId}`} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent-primary" />
              Branch Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Branch Code</span>
                <span className="font-medium">BR-002</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">Mumbai South</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent-primary" />
              Staff & Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manager</span>
                <span className="font-medium">Rahul Sharma</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Staff</span>
                <span className="font-medium">12</span>
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full">Manage Staff</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="primary" className="w-full">
              Open Branch (Context Switch)
            </Button>
            <Button variant="outline" className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              Branch Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
