import { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCircle, ArrowLeft, Building2, History } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Staff Details | Super Admin | MedCare ERP',
  description: 'View and manage staff member',
};

export default function SuperAdminStaffDetailPage({ params }: { params: { id: string } }) {
  const staffId = params.id;
  
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/staff">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <PageHeader 
          title="Staff Details" 
          description={`Managing staff member: ${staffId}`} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-accent-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">Priya Singh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="outline">Pharmacist</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">priya@medcare.com</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent-primary" />
              Branch Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Current Branch</p>
                <div className="flex items-center gap-2 font-medium">
                  Branch 02 (Mumbai South)
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Transfer Staff
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-accent-primary" />
              Transfer History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="border-l-2 border-border-default pl-4 pb-4">
                <p className="font-medium">Assigned to Branch 02</p>
                <p className="text-xs text-muted-foreground">Aug 20, 2026 by Super Admin</p>
              </div>
              <div className="border-l-2 border-border-default pl-4 pb-4">
                <p className="font-medium">Transferred from Main Branch</p>
                <p className="text-xs text-muted-foreground">Aug 20, 2026</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
